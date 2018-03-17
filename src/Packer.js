const MaxRects = require('./MaxRects')
const {calc_bin_height, pick_shortest} = require('./utils')

const MODES = [
	MaxRects.BottomLeft,
	MaxRects.ShortSide,
	MaxRects.LongSide,
	MaxRects.BestArea,
	MaxRects.ContactPoint,
]

const DISABLE_ROTATION_MODES = MODES.map(mode => mode + 10)

class Packer {
	constructor(params = {}){
		this.params = {
			mode: 'auto',
			rotate: true,
			padding: 0,
			width: 0,
			...params,
			height: Infinity,
		}

		this.validate_options()
		this.input_sprites = []
		this.input_rects = []

		return this
	}
	pack_mode(mode){
		return typeof mode === 'number'
			? (MaxRects.Modes[mode] || -1)
			: MaxRects.Modes.indexOf(mode)
	}
	validate_options(){
		if(typeof this.params.rotate !== 'boolean'){
			const error = new TypeError('Rotate must be a boolean.')
			error.source = 'options.rotate'
			error.reason = 'not-a-boolean'
			throw error
		}

		if(typeof this.params.width !== 'number'){
			const error = new TypeError('Width must be a non-negative number.')
			error.source = 'options.width'
			error.reason = 'not-a-number'
			throw error
		}

		if(this.params.width < 0){
			const error = new RangeError('Width must be a non-negative number.')
			error.source = 'options.width'
			error.reason = 'negative-number'
			throw error
		}

		if(typeof this.params.padding !== 'number'){
			const error = new TypeError('Padding must be a non-negative number.')
			error.source = 'options.padding'
			error.reason = 'not-a-number'
			throw error
		}

		if(this.params.padding < 0){
			const error = new RangeError('Padding must be a non-negative number.')
			error.source = 'options.padding'
			error.reason = 'negative-number'
			throw error
		}

		if(this.pack_mode(this.params.mode) < 0){
			const error = new RangeError(`Invalid mode. must be one of: ${JSON.stringify(MaxRects.Modes)}`)
			error.source = 'options.mode'
			error.reason = 'invalid'
			throw error
		}
	}
	load(data){
		if(!Array.isArray(data)){
			const error = new TypeError('Sprites must be an array.')
			error.source = 'sprites'
			error.reason = 'not-an-array'
			throw error
		}

		const {
			rotate, padding,
			width: canvas_width,
			height: canvas_height,
		} = this.params

		this.input_sprites = data

		this.input_rects = data.map(sprite => {
			const width = sprite.width + padding
			const height = sprite.height + padding
			let rotated = false

			if(width > canvas_width && height > canvas_height){
				const error = new RangeError('Sprite is larger than canvas.')
				error.source = 'sprite'
				error.reason = 'out-of-bounds'
				error.ref = sprite
				throw error
			}

			if(width > canvas_width || height > canvas_height){
				if(!rotate){
					const error = new RangeError('Sprite is larger than canvas.')
					error.source = 'sprite'
					error.reason = 'out-of-bounds'
					error.ref = sprite
					throw error
				}
				if(height > canvas_width || width > canvas_height){
					const error = new RangeError('Sprite is larger than canvas.')
					error.source = 'sprite'
					error.reason = 'out-of-bounds'
					error.ref = sprite
					throw error
				}
				this.forced_rotate = true
				rotated = true
			}
			return {width, height, rotated}
		})

		return this
	}
	compute(){
		const mode = this.pack_mode(this.params.mode)
		const compute = this.compute_result.bind(this)
		if(mode) return compute(mode)

		const best = pick_shortest(MODES.map(compute))

		if(!best.slices) return best
		if(!this.params.rotate) return best
		if(this.forced_rotate) return best
		if(best.slices.every(slice => !slice.rotated)) return best

		return pick_shortest([best, ...DISABLE_ROTATION_MODES.map(compute)])
	}
	compute_result(mode){
		const result = this.apply_algorithm(mode)

		if(result.length > 1){
			const error = new Error('Algorithm misbehaviour')
			error.source = 'algorithm'
			error.reason = 'multi-page'
			throw error
		}

		const {width, rotate} = this.params
		const base = {slices: [], width, height: 0, meta: {mode, rotate}}

		try{
			const [{width, height, sprites: slices}] = result
			return {...base, slices, width, height}
		}catch(e){
			return base
		}
	}
	apply_algorithm(mode){
		var results = []

		var result_rects = []
		var result_indices = []
		var input_indices = []
		var rects_indices = []

		for(var i = 0; i < this.input_rects.length; i++) input_indices.push(i)

		var {width: w, height: h, padding} = this.params

		while(input_indices.length > 0){
			rects_indices = input_indices.slice(0)

			var packer = new MaxRects(mode, w - padding, h - padding, this.params.rotate)
			var [result_rects, result_indices] = packer.insert(this.input_rects, rects_indices)

			var add_result = false

			if(rects_indices.length > 0){
				add_result = true
				var tmp = []
				for(var j = 0; j < input_indices.length; j++) tmp[j] = input_indices[j]
				for(var j = 0; j < rects_indices.length; j++) input_indices[j] = rects_indices[j]
				input_indices.length = rects_indices.length
				for(var j = 0; j < tmp.length; j++) rects_indices[j] = tmp[j]
				rects_indices.length = tmp.length
			}else{
				add_result = true
				input_indices.length = 0
			}

			if(add_result){
				var result = {
					sprites: [],
					width: w,
					height: h,
				}

				var xmin = w
				var xmax = 0
				var ymin = h
				var ymax = 0

				for(var i = 0; i < result_rects.length; i++){
					const index = result_indices[i]
					const base_rect = this.input_rects[index]
					const rect = result_rects[i]

					result.sprites.push({
						...this.input_sprites[index],
						x: rect.x + padding,
						y: rect.y + padding,
						rotated: rect.width !== base_rect.width,
					})

					xmin = Math.min(xmin, rect.x)
					xmax = Math.max(xmax, rect.x + rect.width)
					ymin = Math.min(ymin, rect.y)
					ymax = Math.max(ymax, rect.y + rect.height)
				}

				results.push(result)

				if(input_indices.length > 0){
					w = this.params.width
					h = this.params.height
				}
			}
		}
		return results.map(bin => ({...bin, height: calc_bin_height(bin)}))
	}
}

module.exports = Packer
