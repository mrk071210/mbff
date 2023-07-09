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
      children.push(parseTable(item));
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

const parseTable = (option) => {
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

export default createDocx;
