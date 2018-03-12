const packer = require('./dist')({
	width: 800,
})

const A1LandscapePaper = {width: 851, height: 594}

console.log(packer([A1LandscapePaper]))
console.log(packer([]))
