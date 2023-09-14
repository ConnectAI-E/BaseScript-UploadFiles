//本函数将作用于所有记录，然后挑选出该记录所需要用到的文件（优先级低于下方的覆盖已有文件开关）
/**
 * compareValues：当前记录所选标识字段单元格原始值数组，顺序同选项所选
 * fileList: 所选的所有文件列表
 * currentValue: 当前记录所选附件字段的值
 */
function pickFile({ compareValues, fileList, currentValue }) {
    const reg = window._reg || /[,，。、;；\s]+/g
    let firstCelValue = compareValues[0]
    if (!Array.isArray(firstCelValue)) {
        // 多行文本类型的字段值为数组/空，过滤掉空的记录
        return currentValue
    }

    firstCelValue = firstCelValue.map(({ text }) => text).join('').replace(reg, ',').split(',')

    const files = fileList.filter((file) => {
        // 文件名（不含文件后缀）
        const fileName = file.name.split('.')[0]
        // 按照标识字段过滤出所需的文件
        return firstCelValue.includes(fileName)

    })

    if (files.length) {
        return files;
    }

    return currentValue // 如果没有匹配上文件，则使用原来的附件
}