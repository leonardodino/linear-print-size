const packer = require('.')({
	height: 5940,
	width: 800,
})

const A1LandscapePaper = {width: 800, height: 594}

console.log(packer([A1LandscapePaper]))
