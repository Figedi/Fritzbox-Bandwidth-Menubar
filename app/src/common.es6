// Put common files in here, can be loaded through systemjs in browser and in
// renderer  with require/import through babel/electron
let _stringify = (o) => {
  let stringifyable = /Object|Array/.test(Object.prototype.toString.call(o))
  return stringifyable ? JSON.stringify(o) : o
}
let _log  = (head, ...args) => {
  let mappedArgs = args.map((e) => { return _stringify(e) }).join('\n')
  console.log(`[${head}] ${mappedArgs}\n`)
}
let common = {
  log: _log
}
export default common;
