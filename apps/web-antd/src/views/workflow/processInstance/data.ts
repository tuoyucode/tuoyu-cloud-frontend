/** 流程变量的显示文本：对象与数组按 JSON 显示 */
export function formatVariableValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * 变量是否可以在界面上修改。后端按字符串保存修改后的值，
 * 修改数字、布尔、对象类的变量会改变它的类型，导致条件表达式出错，所以只允许修改字符串变量
 */
export function isEditableVariable(value: unknown): boolean {
  return typeof value === 'string';
}

/** 变量的类型标签 */
export function variableType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}
