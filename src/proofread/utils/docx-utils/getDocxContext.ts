// import mammoth from 'mammoth';
import mammoth = require('mammoth');
import jsdom = require('jsdom');
const JSDOM = jsdom.JSDOM;
import createDocx from './createDocx';
import checkText from './textCheck';
import checkMethod from './checkMethod';

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

const domList = [];
let index = 1;

// 遍历dom
const traversalDom = (domResult, flag = '') => {
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
        // domList.push(parseTable(node));
      } else {
        traversalDom(node.childNodes);
      }
    }
    if (flag === 'p') {
      domList.push({ type: 'paragraph end', value: null });
    }
  });
};

// 遍历dom，返回结果
const traversalDomReturn = (childNodes, nodeFlag) => {
  const _domList = [{ type: 'table start', value: null, length: 0, id: null }];
  const _traversalDom = (domResult, flag) => {
    domResult.forEach((node) => {
      if (flag === 'p') {
        _domList.push({
          type: 'paragraph start',
          value: null,
          length: 0,
          id: null,
        });
      }
      if (node.nodeType === 3) {
        _domList.push({
          type: node.parentElement.tagName,
          value: node.data,
          length: node.data.length,
          id: index,
        });
        index++;
      } else if (node.childNodes.length) {
        if (node.nodeType === 1 && node.tagName === 'TABLE') {
          // parseTable(node);
        } else {
          _traversalDom(node.childNodes, '');
        }
      }
      if (flag === 'p') {
        _domList.push({
          type: 'paragraph end',
          value: null,
          length: 0,
          id: null,
        });
      }
    });
  };
  _traversalDom(childNodes, nodeFlag);
  _domList.push({ type: 'table end', value: null, length: 0, id: null });
  return _domList;
};

const parseTable = (node) => {
  const tableOptions = {
    type: 'TABLE',
    children: [],
  };
  if (node.tagName === 'TABLE') {
    const tbody = (Array.from(node.childNodes) as any[]).find(
      (item) => item.tagName === 'TBODY',
    );
    if (tbody) {
      tableOptions.children.push({
        type: 'TBODY',
        children: [],
        rows: tbody.rows.length,
      });
    }
    (Array.from(tbody.rows) as any).forEach((row, rowIndex) => {
      tableOptions.children[0].children.push({
        type: 'TR',
        children: [],
        cells: row.cells.length,
      });
      (Array.from(row.cells) as any).forEach((col, colIndex) => {
        tableOptions.children[0].children[rowIndex].children.push({
          type: 'TD',
          children: traversalDomReturn(col.childNodes, 'p'),
          colSpan: col.colSpan,
          rowSpan: col.rowSpan,
        });
      });
    });
  }
  return tableOptions;
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

const getDocxContext = async (filepath, outputfilename) => {
  const result = await mammoth.convertToHtml({ path: filepath }, options);
  try {
    const html = result.value; // The generated HTML
    const messages = result.messages; // Any messages, such as warnings during conversion
    const placeholder = new JSDOM(`<div></div>`);
    placeholder.window.document.body.innerHTML = html;
    traversalDom(placeholder.window.document.body.childNodes, 'p');
    const checkTextResult = checkText(domList);

    const resList = await Promise.all(
      checkTextResult.textList.map((item) => checkMethod(item)),
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
    console.log(2, createFlag);
    return createFlag;
  } catch (e) {
    console.log(12312);
    throw e;
  }
};

export default getDocxContext;
