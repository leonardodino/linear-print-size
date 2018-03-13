const MaxRects = require('./MaxRects')
const {calc_bin_height} = require('./utils')

const modes = [
	MaxRects.BottomLeft,
	MaxRects.ShortSide,
	MaxRects.LongSide,
	MaxRects.BestArea,
	MaxRects.ContactPoint,
]

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

		if(this.params.padding < 0)
			throw new Error('Invalid padding')
		if(this.pack_mode(this.params.mode) < 0)
			throw new Error('Invalid packing mode')

		this.input_sprites = []
		this.input_rects = []

		return this
	}
	pack_mode(mode){
		return typeof mode === 'number'
			? (MaxRects.Modes[mode] || -1)
			: MaxRects.Modes.indexOf(mode)
	}
	load(data){
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
				throw new Error('Sprite cannot fit on canvas')
			}

			if(width > canvas_width || height > canvas_height){
				if(!rotate){
					throw new Error('Sprite cannot fit on canvas')
				}
				rotated = true
				if(height > canvas_width || width > canvas_height){
					throw new Error('Sprite cannot fit on canvas')
				}
			}

			return {width, height, rotated}
		})

		return this
	}
	compute(){
		const mode = this.pack_mode(this.params.mode)
		const compute = this.compute_result.bind(this)
		if(mode) return compute(mode)
		return modes.map(compute).reduce(
			(best, result) => result.height < best.height ? result : best, {height: Infinity}
		)
	}
	compute_result(mode){
		const result = this.apply_algorithm(mode)
		if(result.length > 1) throw new Error('multisheet error')
		try{
			const [{width, height, sprites: slices}] = result
			return {slices, width, height}
		}catch(e){
			return {width: this.params.width, height: 0, sprites: []}
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
