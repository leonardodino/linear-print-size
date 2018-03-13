const packer = require('./dist')({width: 600})

const A1 = {width: 841, height: 594}
const A4 = {width: 210, height: 297}

console.log(packer([A4, A1, A4]))
console.log(packer([]))
