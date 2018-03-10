const Packer = require('./lib/Packer.js')

module.exports = (options = {}) => (sprites = []) => {
	const instance = new Packer(options)
	if(!instance.validate_params()) return null
	if(!instance.load_sprites_info(sprites)) return null
	return instance.compute_results()
}
