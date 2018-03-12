const Packer = require('./Packer.js')

module.exports = (options = {}) => (sprites = []) => {
	const instance = new Packer(options)
	const result = instance.load_sprites_info(sprites).compute_results()
	if(result.length > 1) throw new Error('multisheet error')
	const {width, height, sprites: slices} = result[0] || {width: options.width || 0, height: 0, sprites: []}
	return {slices, width, height}
}
