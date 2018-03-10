/*
 The MIT License (MIT)

 Copyright (c) 2013-2016 Mariano Cuatrin
 Copyright (c) 2016-2018 Rhody Lugo
 Copyright (c) 2018      Leonardo Dino


 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


//  MODES: ===========
//  0 'auto'
//  1 'bottom-left'
//  2 'short-side'
//  3 'long-side'
//  4 'best-area'
//  5 'contact-point'

const MaxRects = require('./MaxRects')

class Packer {
	constructor(params = {}){
		this.params = {
			mode: 'auto',
			rotate: false,
			padding: 0,
			width: 0,
			height: 0,
			max_size: false,
			...params,
		}

		this.input_sprites = []
		this.input_rects = []
	}
	pack_mode(mode){
		if(typeof mode === 'string'){
			for(var i = 0; i < MaxRects.Modes.length; i++){
				if(mode === MaxRects.Modes[i]) return i
			}
		}
		var i = parseInt(mode)
		if(i >= 0 && i < MaxRects.Modes.length){
			return i
		}
		return -1
	}
	validate_params(){
		if(this.params.padding < 0){
			throw 'Invalid padding'
		}

		if(
			(this.params.width > 0 || this.params.height > 0 || this.params.max_size) &&
			(this.params.width <= 0 || this.params.height <= 0)
		){
			throw 'Invalid size'
		}

		if(this.pack_mode(this.params.mode) == -1){
			throw 'Invalid packing mode'
		}

		return true
	}
	load_sprites_info(data){
		const {padding, width, height} = this.params
		this.input_sprites = data

		this.input_rects = this.input_sprites.map(sprite => ({
			width: sprite.width + padding,
			height: sprite.height + padding,
		}))

		if(width && height){
			this.input_sprites.forEach(sprite => {
				var w = 2 * padding + sprite.width
				var h = 2 * padding + sprite.height
				var offenses = 0 + (w > width) + h > height
				if(offenses) throw 'Some of the sprites are larger than the allowed size'
			})
		}

		return true
	}
	has_fixed_size(){
		return this.params.width > 0 && this.params.height > 0 && !this.params.max_size
	}
	can_enlarge(width, height){
		return !this.has_fixed_size() && (!this.params.max_size || width < this.params.width || height < this.params.height)
	}
	calculate_initial_size(rect_indices){
		var rect = {}

		if(this.has_fixed_size()){
			rect.width = this.params.width
			rect.height = this.params.height
			return rect
		}

		var area = 0

		for(var i = 0; i < rect_indices.length; i++){
			var rc = this.input_rects[rect_indices[i]]
			area += rc.width * rc.height
		}

		var n = 1
		var size = Math.ceil(Math.sqrt(area))

		while(n < size) n <<= 1

		rect.width = rect.height = n

		if(this.params.max_size){
			rect.width = Math.min(n, this.params.width)
			rect.height = Math.min(n, this.params.height)
		}

		return rect
	}
	compute_results(){
		var result = []

		var mode = this.pack_mode(this.params.mode)

		if(mode == 0){
			var modes = [MaxRects.BottomLeft, MaxRects.ShortSide, MaxRects.LongSide, MaxRects.BestArea, MaxRects.ContactPoint]

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
		}else{
			result = this.compute_result(mode)
		}

		return result
	}
	compute_result(mode){
		var results = []

		var result_rects = []
		var result_indices = []
		var input_indices = []
		var rects_indices = []

		for(var i = 0; i < this.input_rects.length; i++) input_indices.push(i)

		var size = this.calculate_initial_size(input_indices)

		var w = size.width
		var h = size.height

		while(input_indices.length > 0){
			rects_indices = input_indices.slice(0)

			var packer = new MaxRects(w - this.params.padding, h - this.params.padding, this.params.rotate)

			packer.insert(mode, this.input_rects, rects_indices, result_rects, result_indices)

			var add_result = false

			if(rects_indices.length > 0){
				if(this.can_enlarge(w, h)){
					if(this.params.max_size){
						if((w > h && h >= this.params.height) || (w <= h && w < this.params.width))
							w = Math.min(w * 2, this.params.width)
						else h = Math.min(h * 2, this.params.height)
					}else{
						if(w > h) h *= 2
						else w *= 2
					}
				}else{
					add_result = true

					var tmp = []
					for(var j = 0; j < input_indices.length; j++) tmp[j] = input_indices[j]
					for(var j = 0; j < rects_indices.length; j++) input_indices[j] = rects_indices[j]
					input_indices.length = rects_indices.length
					for(var j = 0; j < tmp.length; j++) rects_indices[j] = tmp[j]
					rects_indices.length = tmp.length
				}
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

				if(!this.has_fixed_size()){
					result.width = xmax - xmin + this.params.padding
					result.height = ymax - ymin + this.params.padding

					if(xmin > 0 || ymin > 0){
						for(var i = 0; i < result.sprites.length; i++){
							result.sprites[i].x -= xmin
							result.sprites[i].y -= ymin
						}
					}
				}

				results.push(result)

				if(input_indices.length > 0){
					var rect = this.calculate_initial_size(input_indices)
					w = rect.width
					h = rect.height
				}
			}
		}
		return results
	}
}

module.exports = Packer
