const empty_rect = {x: 0, y: 0, width: 0, height: 0}

rect_is_contained_in = (a, b) => {
	return a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height
}

rect_common_interval_length = (i1start, i1end, i2start, i2end) => {
	if(i1end < i2start || i2end < i1start) return 0
	return Math.min(i1end, i2end) - Math.max(i1start, i2start)
}


class MaxRects {
	constructor(mode, width = 0, height = 0, rotate = false){
		this.mode = mode
		this.width = width
		this.height = height
		this.rotate = rotate

		if(mode >= 10 && rotate){
			this.mode -= 10
			this.rotate = !rotate
		}

		this.used = []
		this.free = [{
			x: 0,
			y: 0,
			width: width,
			height: height,
		}]
	}
	insert(rects, rects_indices){
		const {mode} = this
		const result = []
		const result_indices = []

		while(rects_indices.length > 0){
			var bestNode = {...empty_rect}

			var bestScore1 = Infinity
			var bestScore2 = Infinity
			var bestRectIndex = -1

			for(var i = 0; i < rects_indices.length; ++i){
				var rect = rects[rects_indices[i]]

				var [newNode, score1 = 0, score2 = 0] = this.score_rect(rect.width, rect.height, mode)

				if(score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)){
					bestScore1 = score1
					bestScore2 = score2
					bestNode = newNode
					bestRectIndex = i
				}
			}

			if(bestNode.height === 0 || bestRectIndex === -1) break

			this.place_rect(bestNode)

			result.push(bestNode)
			result_indices.push(rects_indices[bestRectIndex])
			rects_indices.splice(bestRectIndex, 1)
		}

		return [result, result_indices]
	}
	score_rect(width, height, mode){
		var newNode = empty_rect
		var score1 = Infinity
		var score2 = Infinity

		switch (mode){
			case MaxRects.ShortSide:
				[newNode, score1, score2] = this.find_ss(width, height)
				break

			case MaxRects.BottomLeft:
				[newNode, score1, score2] = this.find_bl(width, height)
				break

			case MaxRects.ContactPoint:
				[newNode, score1] = this.find_cp(width, height)
				score1 = -score1
				break

			case MaxRects.LongSide:
				[newNode, score2, score1] = this.find_ls(width, height)
				break

			case MaxRects.BestArea:
				[newNode, score1, score2] = this.find_ba(width, height)
				break
		}

		if(newNode.height === 0 && newNode.width === 0){
			score1 = Infinity
			score2 = Infinity
		}

		return [newNode, score1, score2]
	}
	place_rect(node){
		var numRectanglesToProcess = this.free.length

		for(var i = 0; i < numRectanglesToProcess; ++i){
			if(this.split_free_node(this.free[i], node)){
				this.free.splice(i, 1)
				--i
				--numRectanglesToProcess
			}
		}

		this.prune_free_list()
		this.used.push(node)
	}
	score_node_cp(x, y, width, height){
		var score = 0

		if(x === 0 || x + width === this.width) score += height

		if(y === 0 || y + height === this.height) score += width

		for(var i = 0; i < this.used.length; ++i){
			if(this.used[i].x === x + width || this.used[i].x + this.used[i].width === x)
				score += rect_common_interval_length(this.used[i].y, this.used[i].y + this.used[i].height, y, y + height)

			if(this.used[i].y === y + height || this.used[i].y + this.used[i].height === y)
				score += rect_common_interval_length(this.used[i].x, this.used[i].x + this.used[i].width, x, x + width)
		}

		return score
	}
	find_bl(width, height){
		var bestNode = {...empty_rect}
		var bestY = Infinity
		var bestX = Infinity

		for(var i = 0; i < this.free.length; ++i){
			if(this.free[i].width >= width && this.free[i].height >= height){
				var topSideY = this.free[i].y + height

				if(topSideY < bestY || (topSideY === bestY && this.free[i].x < bestX)){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = width
					bestNode.height = height
					bestY = topSideY
					bestX = this.free[i].x
				}
			}

			if(this.rotate && this.free[i].width >= height && this.free[i].height >= width){
				var topSideY = this.free[i].y + width

				if(topSideY < bestY || (topSideY === bestY && this.free[i].x < bestX)){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = height
					bestNode.height = width
					bestY = topSideY
					bestX = this.free[i].x
				}
			}
		}

		return [bestNode, bestY, bestX]
	}
	find_ss(width, height){
		var bestNode = {...empty_rect}
		var bestShortSideFit = Infinity
		var bestLongSideFit = Infinity

		for(var i = 0; i < this.free.length; ++i){
			if(this.free[i].width >= width && this.free[i].height >= height){
				var leftoverHoriz = Math.abs(this.free[i].width - width)
				var leftoverVert = Math.abs(this.free[i].height - height)
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert)
				var longSideFit = Math.max(leftoverHoriz, leftoverVert)

				if(
					shortSideFit < bestShortSideFit ||
					(shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
				){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = width
					bestNode.height = height
					bestShortSideFit = shortSideFit
					bestLongSideFit = longSideFit
				}
			}

			if(this.rotate && this.free[i].width >= height && this.free[i].height >= width){
				var flippedLeftoverHoriz = Math.abs(this.free[i].width - height)
				var flippedLeftoverVert = Math.abs(this.free[i].height - width)
				var flippedShortSideFit = Math.min(flippedLeftoverHoriz, flippedLeftoverVert)
				var flippedLongSideFit = Math.max(flippedLeftoverHoriz, flippedLeftoverVert)

				if(
					flippedShortSideFit < bestShortSideFit ||
					(flippedShortSideFit === bestShortSideFit && flippedLongSideFit < bestLongSideFit)
				){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = height
					bestNode.height = width
					bestShortSideFit = flippedShortSideFit
					bestLongSideFit = flippedLongSideFit
				}
			}
		}

		return [bestNode, bestShortSideFit, bestLongSideFit]
	}
	find_ls(width, height){
		var bestNode = {...empty_rect}
		var bestLongSideFit = Infinity
		var bestShortSideFit = Infinity

		for(var i = 0; i < this.free.length; ++i){
			if(this.free[i].width >= width && this.free[i].height >= height){
				var leftoverHoriz = Math.abs(this.free[i].width - width)
				var leftoverVert = Math.abs(this.free[i].height - height)
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert)
				var longSideFit = Math.max(leftoverHoriz, leftoverVert)

				if(
					longSideFit < bestLongSideFit ||
					(longSideFit === bestLongSideFit && shortSideFit < bestShortSideFit)
				){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = width
					bestNode.height = height
					bestShortSideFit = shortSideFit
					bestLongSideFit = longSideFit
				}
			}

			if(this.rotate && this.free[i].width >= height && this.free[i].height >= width){
				var leftoverHoriz = Math.abs(this.free[i].width - height)
				var leftoverVert = Math.abs(this.free[i].height - width)
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert)
				var longSideFit = Math.max(leftoverHoriz, leftoverVert)

				if(
					longSideFit < bestLongSideFit ||
					(longSideFit === bestLongSideFit && shortSideFit < bestShortSideFit)
				){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = height
					bestNode.height = width
					bestShortSideFit = shortSideFit
					bestLongSideFit = longSideFit
				}
			}
		}

		return [bestNode, bestShortSideFit, bestLongSideFit]
	}
	find_ba(width, height, bestAreaFit, bestShortSideFit){
		var bestNode = {...empty_rect}
		var bestAreaFit = Infinity
		var bestShortSideFit = Infinity

		for(var i = 0; i < this.free.length; ++i){
			var areaFit = this.free[i].width * this.free[i].height - width * height

			if(this.free[i].width >= width && this.free[i].height >= height){
				var leftoverHoriz = Math.abs(this.free[i].width - width)
				var leftoverVert = Math.abs(this.free[i].height - height)
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert)

				if(areaFit < bestAreaFit || (areaFit === bestAreaFit && shortSideFit < bestShortSideFit)){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = width
					bestNode.height = height
					bestShortSideFit = shortSideFit
					bestAreaFit = areaFit
				}
			}

			if(this.rotate && this.free[i].width >= height && this.free[i].height >= width){
				var leftoverHoriz = Math.abs(this.free[i].width - height)
				var leftoverVert = Math.abs(this.free[i].height - width)
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert)

				if(areaFit < bestAreaFit || (areaFit === bestAreaFit && shortSideFit < bestShortSideFit)){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = height
					bestNode.height = width
					bestShortSideFit = shortSideFit
					bestAreaFit = areaFit
				}
			}
		}

		return [bestNode, bestAreaFit, bestShortSideFit]
	}
	find_cp(width, height, bestContactScore){
		var bestNode = {...empty_rect}
		var bestContactScore = -1

		for(var i = 0; i < this.free.length; ++i){
			if(this.free[i].width >= width && this.free[i].height >= height){
				var score = this.score_node_cp(this.free[i].x, this.free[i].y, width, height)

				if(score > bestContactScore){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = width
					bestNode.height = height
					bestContactScore = score
				}
			}

			if(this.rotate && this.free[i].width >= height && this.free[i].height >= width){
				var score = this.score_node_cp(this.free[i].x, this.free[i].y, height, width)

				if(score > bestContactScore){
					bestNode.x = this.free[i].x
					bestNode.y = this.free[i].y
					bestNode.width = height
					bestNode.height = width
					bestContactScore = score
				}
			}
		}

		return [bestNode, bestContactScore]
	}
	split_free_node(freeNode, usedNode){
		if(
			usedNode.x >= freeNode.x + freeNode.width ||
			usedNode.x + usedNode.width <= freeNode.x ||
			usedNode.y >= freeNode.y + freeNode.height ||
			usedNode.y + usedNode.height <= freeNode.y
		)
			return false

		if(usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x){
			if(usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height){
				var newNode = {...freeNode}
				newNode.height = usedNode.y - newNode.y
				this.free.push(newNode)
			}

			if(usedNode.y + usedNode.height < freeNode.y + freeNode.height){
				var newNode = {...freeNode}
				newNode.y = usedNode.y + usedNode.height
				newNode.height = freeNode.y + freeNode.height - (usedNode.y + usedNode.height)
				this.free.push(newNode)
			}
		}

		if(usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y){
			if(usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width){
				var newNode = {...freeNode}
				newNode.width = usedNode.x - newNode.x
				this.free.push(newNode)
			}

			if(usedNode.x + usedNode.width < freeNode.x + freeNode.width){
				var newNode = {...freeNode}
				newNode.x = usedNode.x + usedNode.width
				newNode.width = freeNode.x + freeNode.width - (usedNode.x + usedNode.width)
				this.free.push(newNode)
			}
		}

		return true
	}
	prune_free_list(){
		for(var i = 0; i < this.free.length; ++i){
			for(var j = i + 1; j < this.free.length; ++j){
				if(rect_is_contained_in(this.free[i], this.free[j])){
					this.free.splice(i, 1)
					--i
					break
				}

				if(rect_is_contained_in(this.free[j], this.free[i])){
					this.free.splice(j, 1)
					--j
				}
			}
		}
	}
}

MaxRects.ShortSide = 1
MaxRects.LongSide = 2
MaxRects.BestArea = 3
MaxRects.BottomLeft = 4
MaxRects.ContactPoint = 5
MaxRects.Modes = ['auto', 'short-side', 'long-side', 'best-area', 'bottom-left', 'contact-point']

module.exports = MaxRects
