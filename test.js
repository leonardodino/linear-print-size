const packer = require('./dist')({width: 630})

const A1 = {width: 841, height: 594}
const A4 = {width: 210, height: 297}

console.log(packer([A4, A1, A4]))
// console.log(packer([]))
// if(packer([A4, A4, A4]).height > 300) throw new Error()
