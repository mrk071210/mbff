import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import mammoth = require('mammoth');
import jsdom = require('jsdom');
const JSDOM = jsdom.JSDOM;
// import createDocx from './createDocx';
// import checkText from './textCheck';
// import checkMethod from './checkMethod';
import * as crypto from 'crypto';
import got from 'got';
import { RedisClientType } from 'redis';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TableCell,
  TableRow,
  Table,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment-es6';
import { ProofreadService } from './proofread.service';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Proofread } from './entities/proofread.entity';

const ErrMap = {
  black_list: '黑名单纠错',
  pol: '政治术语纠错',
  char: '别字纠错',
  word: '别词纠错',
  redund: '语法纠错-冗余',
  miss: '语法纠错-缺失',
  order: '语法纠错-乱序',
  dapei: '搭配纠错',
  punc: '标点纠错',
  idm: '成语纠错',
  org: '机构名纠错',
  leader: '领导人职称纠错',
  number: '数字纠错',
  addr: '地名纠错',
  name: '全文人名纠错',
  grammar_pc: '句式杂糅&语义重复',
};

const APISecret = 'MTc5NWY2MDk3YTQ5ZTA1OWE2MjkzMzA0';
const APIKey = 'e2c6c0be200735b4ef16d65612a44241';

// 不展示图片
const options = {
  convertImage: mammoth.images.imgElement(() => {
    return Promise.resolve({ src: '' });
  }),
  styleMap: [
    "p[style-name='Section Title'] => h1:fresh",
    "p[style-name='Subsection Title'] => h2:fresh",
    'b => ',
    'i => ',
  ],
};

let index = 1;

// 遍历dom，返回结果
const traversalDomReturn = (childNodes, nodeFlag) => {
  let text = '';
  let length = 0;
  const _domList: any[] = [{ type: 'table start', value: null }];
  const _traversalDom = (domResult, flag) => {
    domResult.forEach((node) => {
      if (flag === 'p') {
        _domList.push({ type: 'paragraph start', value: null });
      }
      if (node.nodeType === 3) {
        _domList.push({
          type: node.parentElement.tagName,
          value: node.data,
          length: node.data.length,
          id: index,
        });
        index++;
        length += node.data.length;
        text += node.data;
      } else if (node.childNodes.length) {
        if (node.nodeType === 1 && node.tagName === 'TABLE') {
          // _domList.push(parseTable(node, _domList))
        } else {
          _traversalDom(node.childNodes, '');
        }
      }
      if (flag === 'p') {
        _domList.push({ type: 'paragraph end', value: null });
      }
    });
  };
  _traversalDom(childNodes, nodeFlag);
  _domList.push({ type: 'table end', value: null });
  return { children: _domList, length, tableText: text };
};

const parseTable = (node) => {
  const tableOptions = {
    type: 'TABLE',
    children: [],
    length: 0,
    value: '',
  };
  if (node.tagName === 'TABLE') {
    const tbody = Array.from(node.childNodes).find(
      (item: any) => item.tagName === 'TBODY',
    ) as any;
    if (tbody) {
      tableOptions.children.push({
        type: 'TBODY',
        children: [],
        rows: tbody.rows.length,
      });
    }
    Array.from(tbody.rows).forEach((row: any, rowIndex) => {
      tableOptions.children[0].children.push({
        type: 'TR',
        children: [],
        cells: row.cells.length,
      });
      Array.from(row.cells).forEach((col: any, colIndex) => {
        const { children, length, tableText } = traversalDomReturn(
          col.childNodes,
          'p',
        );
        tableOptions.length += length;
        tableOptions.value += tableText;
        tableOptions.children[0].children[rowIndex].children.push({
          type: 'TD',
          children: children,
          colSpan: col.colSpan,
          rowSpan: col.rowSpan,
          length: length,
        });
      });
    });
  }
  // console.log(tableOptions)
  return tableOptions;
};

// 遍历dom
const getDomList = (domResult, flag) => {
  const domList = [];
  let index = 1;
  const traversalDom = (domResult, flag = undefined) => {
    domResult.forEach((node) => {
      if (flag === 'p') {
        domList.push({ type: 'paragraph start', value: null });
      }
      if (node.nodeType === 3) {
        domList.push({
          type: node.parentElement.tagName,
          value: node.data,
          length: node.data.length,
          id: index,
        });
        index++;
      } else if (node.childNodes.length) {
        if (node.nodeType === 1 && node.tagName === 'TABLE') {
          const tabOption = parseTable(node);
          domList.push(tabOption);
        } else {
          traversalDom(node.childNodes);
        }
      }
      if (flag === 'p') {
        domList.push({ type: 'paragraph end', value: null });
      }
    });
  };
  traversalDom(domResult, flag);
  return domList;
};

const dealTableCheckResult = (_tableDom) => {
  const comments = _tableDom.comments;
  let indexStart = 0;
  _tableDom.children[0].children.forEach((tr) => {
    tr.children.forEach((td) => {
      td.children.forEach((child) => {
        if (child.length) {
          child.indexStart = indexStart;
          indexStart += child.length;
          child.indexEnd = indexStart;
          const thisComments = comments.map((comment) => {
            if (
              comment.commentStart >= child.indexStart &&
              comment.commentEnd <= child.indexEnd
            ) {
              comment.commentStart = comment.commentStart - child.indexStart;
              comment.commentEnd = comment.commentEnd - child.indexStart;
              return comment;
            }
          });
          const realComments = thisComments.filter((comment) => comment);
          if (realComments.length) {
            child.comments = realComments;
          }
        }
      });
    });
  });
  return _tableDom;
};

const parseDomText = (dom) => {
  return dom.value;
};

const checkText = (domList) => {
  const textDom = domList.filter((item) => item.length > 0);
  let text = '';
  const textList = [''];
  const textDomList = [[]];
  textDom.forEach((item) => {
    if ((text + item.value).length < 2000) {
      item.indexStart = text.length;
      text += parseDomText(item);
      item.indexEnd = text.length - 1;
      item.comments = [];
      textDomList[textDomList.length - 1].push(item);
      textList[textList.length - 1] = text;
    } else {
      textDomList.push([]);
      text = '';
      textList.push(text);
      if ((text + item.value).length < 2000) {
        item.indexStart = text.length;
        text += parseDomText(item);
        item.indexEnd = text.length - 1;
        item.comments = [];
        textDomList[textDomList.length - 1].push(item);
      }
    }
  });
  return { textList: textList, textDomList: textDomList };
};

const splitCommentsText = (textDom) => {
  const children = [];
  if (textDom?.comments?.length) {
    const { value, type, id, comments } = textDom;
    for (let i = 0; i < comments.length; i++) {
      const newTextHead =
        i === 0 ? value.slice(0, comments[i].commentStart) : undefined;
      const newText = value.slice(
        comments[i].commentStart,
        comments[i].commentEnd,
      );
      const newTextTail = value.slice(
        comments[i].commentEnd,
        i === comments.length - 1 ? undefined : comments[i + 1].commentStart,
      );
      children.push(
        new TextRun(newTextHead || ''),
        new CommentRangeStart(comments[i].id),
        new TextRun(newText || ''),
        new CommentRangeEnd(comments[i].id),
        new TextRun({ children: [new CommentReference(comments[i].id)] }),
        new TextRun(newTextTail || ''),
      );
    }
  } else {
    children.push(new TextRun(textDom.value));
  }
  return children;
};

const parseCommonDom = (_domList) => {
  const children = [];
  let section_children = [];
  _domList.forEach((item) => {
    if (item?.type === 'paragraph start') {
      section_children = [];
    } else if (['P', 'A', 'H1', 'H2', 'H3', 'STRONG'].includes(item?.type)) {
      const result = splitCommentsText(item);
      section_children.push(...result);
    } else if (item?.type === 'TABLE') {
      children.push(parseTableParagraph(item));
    } else if (item?.type === 'paragraph end') {
      const paragraph = new Paragraph({
        children: section_children,
      });
      children.push(paragraph);
      section_children = [];
    }
  });
  return children;
};

const parseTableCells = (options) => {
  const children = [];
  options.forEach((item) => {
    children.push(
      new TableCell({
        children: parseCommonDom(item.children),
        columnSpan: item.colSpan,
        rowSpan: item.rowSpan,
      }),
    );
  });
  return { children };
};

const parseTableRows = (options) => {
  const rows = [];
  options.forEach((item) => {
    rows.push(new TableRow(parseTableCells(item.children)));
  });
  return { rows };
};

const parseTableParagraph = (option) => {
  let table = null;
  if (option.children[0].type === 'TBODY') {
    table = new Table(parseTableRows(option.children[0].children));
  }
  return table;
};

const parseComments = (commentList) => {
  const children = [];
  commentList.forEach((item) => {
    children.push({
      id: item.id,
      date: new Date(),
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: '文本纠错', bold: true }),
            new TextRun({ text: '', break: 1 }),
            new TextRun({ text: `关键词：${item.old}` }),
            new TextRun({ text: '', break: 1 }),
            new TextRun({ text: `建议：${item.new}` }),
            new TextRun({ text: '', break: 1 }),
            new TextRun({ text: `原因：${ErrMap[item.type] || item.type}` }),
          ],
        }),
      ],
    });
  });
  return children;
};

const createDocx = async (domList, outputfilename) => {
  let writeResult;
  const options = parseCommonDom(domList);
  const comments = parseComments(
    domList
      .filter((item) => item?.comments?.length > 0)
      .map((item) => item.comments)
      .flat(),
  );
  const doc = new Document({
    comments: {
      children: comments,
    },
    sections: [
      {
        children: options,
      },
    ],
  });

  const month = moment().format('YYYYMM');

  try {
    if (!fs.existsSync(path.join(process.cwd(), `proofread-downloads`))) {
      fs.mkdirSync(path.join(process.cwd(), `proofread-downloads`));
    }
    if (
      !fs.existsSync(path.join(process.cwd(), `proofread-downloads/${month}`))
    ) {
      fs.mkdirSync(path.join(process.cwd(), `proofread-downloads/${month}`));
    }
  } catch (e) {
    console.log(e);
    throw e;
  }

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(
    `${path.join(
      process.cwd(),
      `proofread-downloads/${month}`,
    )}/智能纠错_${outputfilename}`,
    buffer,
  );
  // eslint-disable-next-line prefer-const
  writeResult = 'success';
  console.log(1, writeResult);
  return writeResult;
};

@Injectable()
export class AiCheckService {
  private logger = new Logger();

  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  @InjectRepository(Proofread)
  private proofreadRepository: Repository<Proofread>;

  async checkMethod(text, taskId, index, totalCount) {
    const host = 'api.xf-yun.com';
    const date = new Date().toUTCString();

    const signature_origin = `host: ${host}\ndate: ${date}\nPOST /v1/private/s9a87e3ec HTTP/1.1`;
    const signature_sha = crypto
      .createHmac('sha256', APISecret)
      .update(signature_origin)
      .digest();
    const signature = signature_sha.toString('base64');
    const authorization_origin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorization_origin).toString('base64');

    const url = `https://api.xf-yun.com/v1/private/s9a87e3ec?${encodeURI(
      `authorization=${authorization}&host=${host}&date=${date}`,
    )}`;
    let response, responseErr;
    try {
      response = await got.post(url, {
        json: {
          header: {
            app_id: '004d0e31',
            status: 3,
          },
          parameter: {
            s9a87e3ec: {
              result: {
                encoding: 'utf8',
                compress: 'raw',
                format: 'json',
              },
            },
          },
          payload: {
            input: {
              encoding: 'utf8',
              compress: 'raw',
              format: 'json',
              status: 3,
              text: Buffer.from(text).toString('base64'),
            },
          },
        } as any,
      });
    } catch (err) {
      response = { timings: err.timings, ...err.response };
      responseErr = err;
    }
    console.log(response.body);
    if (response.statusCode === 200) {
      let result = {} as any;
      try {
        result = JSON.parse(response.body) as any;
        console.log(result);
        this.redisClient.lPush(`task-${taskId}`, [
          JSON.stringify({
            text: text,
            result: result.payload.result.text,
            index: index,
            end: index === totalCount - 1 ? true : false,
          }),
        ]);
      } catch (e) {
        throw e;
      }
      return result;
    } else {
      return {};
    }

    // if (result.header.code === 0) {
    //     const text = Buffer.from(result.payload.result.text, "base64").toString()
    //     console.log(text)
    //     return text
    // } else {
    //     return {}
    // }
  }

  async getDocxContext(filepath, outputfilename, taskId) {
    const result = await mammoth.convertToHtml({ path: filepath }, options);
    try {
      const html = result.value; // The generated HTML
      const messages = result.messages; // Any messages, such as warnings during conversion
      const placeholder = new JSDOM(`<div></div>`);
      placeholder.window.document.body.innerHTML = html;
      const domList = getDomList(
        placeholder.window.document.body.childNodes,
        'p',
      );
      const checkTextResult = checkText(domList);

      const resList = await Promise.all(
        checkTextResult.textList.map((item, index) =>
          this.checkMethod(
            item,
            taskId,
            index,
            checkTextResult.textList.length,
          ),
        ),
      );
      // const resList = [1];
      let commentsId = 0;
      resList.forEach((item: any, index) => {
        const checkResult = JSON.parse(
          Buffer.from(item.payload.result.text, 'base64').toString(),
        );
        // console.log(checkResult)
        // const checkResult = {
        //   black_list: [],
        //   punc: [],
        //   leader: [],
        //   org: [],
        //   pol: [],
        //   grammar_pc: [],
        //   order: [],
        //   idm: [
        //     [29, '锐不可挡', '锐不可当', 'idm'],
        //     [53, '既往开来', '继往开来', 'idm'],
        //     [99, '由然而生', '油然而生', 'idm'],
        //   ],
        //   word: [
        //     [110, '权利', '权力', 'word'],
        //     [250, '危机', '危急', 'word'],
        //   ],
        //   char: [],
        //   redund: [[126, '样', '', 'redund']],
        //   miss: [],
        //   dapei: [],
        //   number: [[10, '6月31日', '', 'date-d']],
        //   addr: [[141, '湖北省张家界市', '湖南省张家界市', 'addr_S']],
        //   name: [],
        // };

        const textDomItem = checkTextResult.textDomList[index];
        const checkCommonList = Object.values(checkResult)
          .flat()
          .sort((a, b) => a[0] - b[0]);
        checkCommonList.forEach((comment) => {
          for (let i = 0; i < textDomItem.length; i++) {
            if (textDomItem[i].indexEnd > comment[0]) {
              const _commentStart = comment[0] - textDomItem[i].indexStart;
              textDomItem[i].comments.push({
                commentStart: _commentStart,
                commentEnd: _commentStart + comment[1].length,
                old: comment[1],
                new: comment[2],
                type: comment[3],
                id: commentsId,
              });
              commentsId++;
              break;
            }
          }
        });
      });

      const _flatTextDomList = checkTextResult.textDomList.flat();

      domList.forEach((item) => {
        const result = _flatTextDomList.find((dom) => dom.id === item.id);
        if (result) {
          item = result;
        }
      });
      domList.forEach((item) => {
        if (item.type === 'TABLE') {
          item = dealTableCheckResult(item);
        }
      });
      const createFlag = await createDocx(domList, outputfilename);
      if (createFlag === 'success') {
        this.updateTask({
          taskId: taskId,
          taskStatus: 2,
        });
      } else {
        this.updateTask({
          taskId: taskId,
          taskStatus: 3,
        });
      }
      return createFlag;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async updateTask(updateInfo: UpdateTaskDto) {
    const fondTask = await this.proofreadRepository.findOneBy({
      taskId: updateInfo.taskId,
    });

    if (!fondTask) {
      this.logger.error(
        { message: `taskId：${updateInfo.taskId}任务不存在` },
        ProofreadService,
      );
      return false;
    } else {
      const saveResult = await this.proofreadRepository.save({
        ...fondTask,
        taskStatus: updateInfo.taskStatus,
      });
      return saveResult;
    }
  }
}
