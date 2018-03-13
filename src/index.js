const Packer = require('./Packer.js')

module.exports = (options = {}) => (sprites = []) => (new Packer(options)).load(sprites).compute()
