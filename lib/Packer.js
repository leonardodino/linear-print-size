const MaxRects = require('./MaxRects')

class Packer {
	constructor(params = {}){
		this.params = {
			mode: 'auto',
			rotate: true,
			padding: 0,
			width: 0,
			height: 0,
			...params,
		}

		this.input_sprites = []
		this.input_rects = []

		this.validate_params()
	}
	pack_mode(mode){
		return typeof mode === 'number'
			? (MaxRects.Modes[mode] || -1)
			: MaxRects.Modes.indexOf(mode)
	}
	validate_params(){
		if(this.params.padding < 0)
			throw 'Invalid padding'
		if(this.pack_mode(this.params.mode) === -1)
			throw 'Invalid packing mode'
	}
	load_sprites_info(data){
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
			}

			return {width, height, rotated}
		})

		return this
	}
	compute_results(){
		var result = []
		var mode = this.pack_mode(this.params.mode)
		if(mode) return this.compute_result(mode)

		var modes = [MaxRects.BottomLeft, MaxRects.ShortSide, MaxRects.LongSide, MaxRects.BestArea, MaxRects.ContactPoint]

		// [TODO]: change best parameter to height
		var best = []
		var best_area = 0

		for(var i = 0; i < modes.length; i++){
			var res = this.compute_result(modes[i])

			var area = 0

			for(var j = 0; j < res.length; j++) area += res[j].width * res[j].height

			if(best.length == 0 || res.length < best.length || (res.length == best.length && area < best_area)){
				for(var j = 0; j < best.length; j++) delete best[j]

				var tmp = []
				for(var j = 0; j < best.length; j++) tmp[j] = best[j]
				for(var j = 0; j < res.length; j++) best[j] = res[j]
				best.length = res.length
				for(var j = 0; j < tmp.length; j++) res[j] = tmp[j]
				res.length = tmp.length

				best_area = area
			}else{
				for(var j = 0; j < res.length; j++) delete res[j]
			}
		}

		var tmp = []
		for(var j = 0; j < best.length; j++) tmp[j] = best[j]
		for(var j = 0; j < result.length; j++) best[j] = result[j]
		best.length = result.length
		for(var j = 0; j < tmp.length; j++) result[j] = tmp[j]
		result.length = tmp.length
		return result
	}
	compute_result(mode){
		var results = []

		var result_rects = []
		var result_indices = []
		var input_indices = []
		var rects_indices = []

		for(var i = 0; i < this.input_rects.length; i++) input_indices.push(i)

		var {width: w, height: h} = this.params

		while(input_indices.length > 0){
			rects_indices = input_indices.slice(0)

			var packer = new MaxRects(w - this.params.padding, h - this.params.padding, this.params.rotate)

			packer.insert(mode, this.input_rects, rects_indices, result_rects, result_indices)

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
					var index = result_indices[i]

					var base_rect = this.input_rects[index]
					var base_sprite = this.input_sprites[index]

					var sprite = {...base_sprite}
					sprite.x = result_rects[i].x + this.params.padding
					sprite.y = result_rects[i].y + this.params.padding
					sprite.rotated = result_rects[i].width != base_rect.width

					result.sprites.push(sprite)

					xmin = Math.min(xmin, result_rects[i].x)
					xmax = Math.max(xmax, result_rects[i].x + result_rects[i].width)
					ymin = Math.min(ymin, result_rects[i].y)
					ymax = Math.max(ymax, result_rects[i].y + result_rects[i].height)
				}

				results.push(result)

				if(input_indices.length > 0){
					w = this.params.width
					h = this.params.height
				}
			}
		}
		return results
	}
}

module.exports = Packer
