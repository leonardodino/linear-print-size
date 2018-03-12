module.exports = {}
module.exports.calc_bin_height = ({sprites}) => sprites.reduce((h, s) => (
	Math.max(h, s[s.rotated ? 'width' : 'height'] + s.y)
), 0)
