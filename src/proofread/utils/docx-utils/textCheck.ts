const checkText = (domList) => {
  const textDom = domList.filter((item) => item.length > 0);
  let text = '';
  const textList = [''];
  const textDomList = [[]];
  textDom.forEach((item) => {
    if ((text + item.value).length < 2000) {
      item.indexStart = text.length;
      text += item.value;
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
        text += item.value;
        item.indexEnd = text.length - 1;
        item.comments = [];
        textDomList[textDomList.length - 1].push(item);
      }
    }
  });
  return { textList: textList, textDomList: textDomList };
};

export default checkText;
