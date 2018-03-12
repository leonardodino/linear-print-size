const Packer = require('./Packer.js')

module.exports = (options = {}) => (sprites = []) => {
	const instance = new Packer(options)

	return instance
		.load_sprites_info(sprites)
		.compute_results()
}
