const packer = require('.')({
	rotate: true,
	height: 594,
	width: 800,
	max_size: true,
})

const A1LandscapePaper = {width: 851, height: 594}

console.log(packer([A1LandscapePaper]))
