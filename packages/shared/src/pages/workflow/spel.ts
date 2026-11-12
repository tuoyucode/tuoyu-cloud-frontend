/**
 * 由组件名、方法名、参数拼出 SpEL 表达式，例如
 * spelRuleComponent、selectDeptLeaderById、initiatorDeptId → #{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)}
 * 只填了参数名时返回变量表达式 ${参数}；信息不足时返回 undefined
 */
export function composeSpel(
  componentName?: string,
  methodName?: string,
  methodParams?: string,
): string | undefined {
  const component = componentName?.trim();
  const method = methodName?.trim();
  const params = (methodParams ?? '')
    .split(',')
    .map((param) => param.trim())
    .filter(Boolean);
  if (component && method) {
    const args = params.map((param) => `#${param}`).join(',');
    return `#{@${component}.${method}(${args})}`;
  }
  if (!component && !method && params.length === 1) {
    return `\${${params[0]}}`;
  }
  return undefined;
}
