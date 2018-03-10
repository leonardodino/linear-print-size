const Packer = require('./lib/Packer.js')

module.exports = (options = {}) => (sprites = []) => {
	const instance = new Packer(options)
	if(!instance.validate_params()) return null
	if(!packer.load_sprites_info(sprites)) return null
	return packer.compute_results()
}
