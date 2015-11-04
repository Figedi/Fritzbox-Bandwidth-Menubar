let inject = (...deps) => {
  return (target) => {
    target.$inject = deps;
  }
}
export default inject;
