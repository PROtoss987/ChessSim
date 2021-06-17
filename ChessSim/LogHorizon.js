var boardTemplate = [[[4,3,2,5,6,2,3,4],[1,1,1,1,1,1,1,1]],
                     [[0,7,3,0,0,3,7,0],[1,1,1,0,0,1,1,1]],]
//Used in calculation for placing pieces on an empty board
//Iterated through and overlayed onto the board array
//var coords;
var legalMoves = [];
var oldselection = []
var turn = 0
var moveHistory = []
var gameState = 0
var enPassant = []
var castling = [[1,1,1],[1,1,1]]
//declaring as global for to work iteratively when the click event triggers in separate functions
var bottomColour = 0
//fetches value from the dropdowns in the HTML
var gamemode = Number(document.getElementById('gamemode').value)
var singleplayer = toBoolean(singleplayer = document.getElementById('playmode').value)

var tile;

function toBoolean (value) {
	switch(value) {
		case 'true':
			return true
		break;
		case 'false':
			return false
		break;
	}
}
function sameArray(firstArray, secondArray) {
    var equal = true
    if (firstArray.length == secondArray.length) {
        for (var i = 0; i < firstArray.length; i++) {
            if (firstArray[i] !== secondArray[i]) {
                equal = false
            }
        }
    }
    else {
        equal = false
    }
    return equal
}

function resizeCanvas (board) {
	var browserHeight = document.body.offsetHeight
	var newSize = browserHeight / 0.9
	document.getElementById('game').height = newSize;
    document.getElementById('game').width = newSize;

    tile = getTileSize(board)
}

function getTileSize(board) {
	//Calculates the size of each tile of the chess board, by dividing the canvas size by average # of squares
	var boardHeight = board.length
	var boardWidth = board[0].length
	var canvas = document.getElementById('game');
	var tile = ((canvas.width + canvas.height)/2) / ((boardHeight+boardWidth)/2)
	
	document.getElementById('game').height = boardHeight*tile;
    document.getElementById('game').width = boardWidth*tile;
    return tile
}

var setUpCounter = 0
function setUp() {
	if (setUpCounter == 0) {
		document.getElementById("setup").style.visibility='hidden';
		document.getElementById("playingregion").style.visibility='visible';
		document.getElementById("setupbutton").innerHTML = "<button onclick=setUp()>Back to setup</button><br>"
		setUpCounter++
	}
	else {
		document.getElementById("setup").style.visibility='visible';
		document.getElementById("playingregion").style.visibility='hidden';
		document.getElementById("setupbutton").innerHTML = "<button onclick=setUp()>Set up</button><br>"
		setUpCounter--
	}
}

function reset() {
	//setting global variables back to their default state
	drawConfirm = false 
	surrConfirm = false

	legalMoves = [];
	oldselection = []
	turn = 0
	moveHistory = []
	gameState = 0
	enPassant = []
	castling = [[1,1,1],[1,1,1]]
	gamemode = Number(document.getElementById('gamemode').value)
	singleplayer = toBoolean(document.getElementById('playmode').value)
	bottomColour = Number(document.getElementById('bottomcolour').value)
	document.getElementById("status").innerHTML = "White to move"

	board = genBoard(gamemode)
	if (bottomColour == 1) {
		flipBoard(false)
	}
	tile = getTileSize(board)
	drawBoard()
}
function undo() {
	if (moveHistory.length > 0) {
		//moveHistory.push([oldselection, coords, board[y][x][0], moveType])
		var lastMove = moveHistory[moveHistory.length-1]
		var oldY = lastMove[0][0]
		var oldX = lastMove[0][1]
		var y = lastMove[1][0]
		var x = lastMove[1][1]

		var secondLastMove = moveHistory[moveHistory.length-2]
		//console.log(moveHistory)
		//undoes castling, otherwise calls the normal move function, which does castling the normal way only
		if (board[y][x][0] == 6 && Math.abs(oldX - x) == 2) {
			if (x > oldX) {
				//right side
				board[y][board[y].length-1] = board[y][oldX+1]
				board[y][oldX+1] = 0
				//moving the king
				board[y][x-2] = board[y][x]
				board[y][x] = 0
			}
			else {
				//left side
				board[y][0] = board[y][oldX-1]
				board[y][oldX-1] = 0
				//moving the king
				board[y][x+2] = board[y][x]
				board[y][x] = 0
			}
		}
		else {
			board = movePiece(lastMove[1],lastMove[0])
		}
		//putting back taken pieces
		if (lastMove[2] != undefined) {
			board[y][x] = [lastMove[2],turn%2]
		}
		enPassant = []
		switch(lastMove[3]) {
			case 1:
				//en passant
				board[y - (-2*Math.abs(turn % 2 - bottomColour) + 1)][x] = [1,turn%2]
			break;
			case 3:
				castling[(turn-1)%2][0] = 1
			break;
			case 4:
				castling[(turn-1)%2][1] = 1
			break;
			case 5:
				castling[(turn-1)%2][2] = 1
			break;
			case 6:
				//de-promotion
				board[oldY][oldX][0] = 1
			break;
		}
		if (moveHistory.length > 1) {
			//set up en passant if it was possible on a previous gamestate
			if (secondLastMove[3] == 2) {
				enPassant = [secondLastMove[1][0] + (-2*Math.abs(turn % 2 - bottomColour) + 1),secondLastMove[1][1]]
			}
		}

		//remove last element
		moveHistory.splice(moveHistory.length-1,1)
		turn --
		drawBoard();
	}
}

function flipBoard (buttonCall) {
	//swaps each tile with its opposite in the y coordinate and x coordinate, rotating the board
	for (var i = 0; i < board.length / 2; i++) {
		for (var j = 0; j < board[i].length; j++) {
			var temp = board[i][j]
			board[i][j] = board[((board.length - 1) - i)][(board[i].length - 1) - j]
			board[((board.length - 1) - i)][(board[i].length - 1) - j] = temp
		}
	}

	//moves the en passant tile for capture to the other side of the board
	if (enPassant.length > 0) {
		enPassant = [board.length - 1 - enPassant[0], Math.abs(enPassant[1] - (board[0].length - 1))]
	}
	//remove move selection
	oldselection = []
	legalMoves = []

	//if called by the button in the html, will change the colour that is meant to be on the bottom. Otherwise it will just rotate the board
	//Additionally only draws the board if the button called it
	if (buttonCall) {
		//sets it to 0 if 1, or 1 if 0
		bottomColour = -1 * bottomColour + 1
		drawBoard()
	}
}

var drawConfirm = false
function declareDraw () {
	//any action apart from clicking again will make it request confirmation
	surrConfirm = false

	if (gameState == 0) {
		if (drawConfirm) {
			gameState = 4
			document.getElementById("status").innerHTML = "Draw declared"
			drawConfirm = false
			drawBoard()
		}
		else {
			alert("Are you sure you want to declare a draw? Click again to confirm")
			drawConfirm = true
		}
	}
}

var surrConfirm = false
function surrender () {
	//any action apart from clicking again will make it request confirmation
	drawConfirm = false

	if (gameState == 0) {
		if (surrConfirm) {
			//2 is black win, 3 is white win
			gameState = 2 + turn % 2
			if (gameState == 2) {
				document.getElementById("status").innerHTML = "Surrender, black win"
			}
			else {
				document.getElementById("status").innerHTML = "Surrender, white win"
			}
			drawConfirm = false
			drawBoard()
		}
		else {
			alert("Are you sure you want to surrender? Click again to confirm")
			surrConfirm = true
		}
	}
}

function genBoard(gamemode) {
	//create an empty board
	gridArray = genGrid(gamemode)
    
    //put pieces onto the empty board
	board = fillGrid(gridArray,gamemode)
	return board
}

function genGrid(gamemode) {
	//populates the board with empty tiles
	var height = -1;
	var width = -1
	switch(gamemode) {
		case 0:
			height = 8;
			width = 8;
		break;
		case 1:
			height = 8;
			width = 8;
		break;
	}
	emptyGrid = []
	for (var i = 0; i < height; i++) {
        emptyGrid.push([])
        for (var j = 0; j < width; j++) {
            emptyGrid[i].push(0)   
        }
    }
    return emptyGrid
}
	
function fillGrid(board, gamemode) {
	//puts the pieces on the board
	//console.log(boardTemplate)
	//used to have a gamemode variable, which was taken out
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			switch(gamemode) {
				case 0:
					//classic
	    			switch(i) {
		    			case 0:
		    				board[i][j] = [boardTemplate[0][0][j],1]
		    			break;
		    			case 1:
		    				board[i][j] = [boardTemplate[0][1][j],1]
		    			break;
		    			case board.length-2:
		    				board[i][j] = [boardTemplate[0][1][j],0]
		    			break;
		    			case board.length-1:
		    				board[i][j] = [boardTemplate[0][0][j],0]
		    			break;
	    			}
				break;
				case 1:
					//dragon siege
					switch(i) {
						case 0:
							if (boardTemplate[0][0][j] != 0) {
								board[i][j] = [boardTemplate[0][0][j],1]
							}
						break;
						case 1:
							if (boardTemplate[0][1][j] != 0) {
								board[i][j] = [boardTemplate[0][1][j],1]
							}
						break;
						case board.length-2:
							if (boardTemplate[1][1][j] != 0) {
								board[i][j] = [boardTemplate[1][1][j],0]
							}
						break;
						case board.length-1:
							if (boardTemplate[1][0][j] != 0) {
								board[i][j] = [boardTemplate[1][0][j],0]
							}
						break;
					}
				break;
			}
		}
	}
	//console.log(board)
    return(board)
}

function drawBoard() {
	//console.log(board)
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			//the index of the tile, and the sum of the indeces
			drawSquare(i,j,(i+j),false)
		}
	}
	//updating the "to move" HTML
	switch (turn % 2) {
		case 0:
			document.getElementById("status").innerHTML = "White to move"
		break;
		case 1:
			document.getElementById("status").innerHTML = "Black to move"
		break;
	}
}

function drawSquare(column, row, indexSum, highlighted) {
    //draws a single square on given coordinates
    //repurposed code from my YR11 Game of Life program
    var c = document.getElementById("game");
    var ctx = c.getContext("2d");
    //the # of the combined index, if its even it is 0th square + 2n so light, dark is 1st square + 2n
    if (indexSum % 2 == 0) {
    	//light
    	ctx.fillStyle = "#FFD39B";
	    if (highlighted) {
	    	//light shade of blue
	    	ctx.fillStyle = "#C4CED9";
	    }
    }
    else {
    	//dark
    	ctx.fillStyle = "#CC724F";
	    if (highlighted) {
	    	//slightly less light shade of blue
	    	ctx.fillStyle = "#82959C";
	    }
    }
    //checks if the tile being drawn has the relevant king on it
	if (typeof board[column][row] === 'object') {
		if (board[column][row][0] == 6 && board[column][row][1] == turn % 2) {
			//If the king is in check, puts a red tile under him
			if (inCheck(board)) {
				ctx.fillStyle = "#FF5555"
			}
		}
	}

    //conversion from list index to pixels
    ctx.fillRect((row * tile), (column * tile), tile, tile);
    drawPiece(row, column, ctx)
}

function drawPiece (row, column, ctx) {
	//console.log(typeof board[column][row])
	var tileValue = board[column][row]
	if (typeof tileValue === 'object') {
		//my images are named according to colour and type, this selects its corresponding png file from an invisible image in the HTML
		//file format: 'Piece colour''Piece type'.png
    	var img = document.getElementById("" + tileValue[1] + tileValue[0]);
    	//checks if the tile has a value. Can be done differently but this also prevents runtime errors from referencing nonexistent tags
    	if (img != null){
    		ctx.drawImage(img, row*tile, column*tile, tile, tile);
    	}
	}
}

function onClick(event) {
	drawConfirm = false 
	surrConfirm = false

	var coords = findClick(event)
	if (coords != -1) {
		var y = coords[0]
		var x = coords[1]
	}

	var oldY = oldselection[0]
	var oldX = oldselection[1]

	var found = false;
	
	if (gameState == 0) {
		//If the selection square is in the list of legal moves for the previous piece
		for (var i = 0; i < legalMoves.length; i++) {
			if (sameArray(legalMoves[i],[y,x])) {
				found = true
			}
		}
		if (found) {
				//moving pieces, and changing relevant variables only used after a finalised move is made, compared to calculation 'moves'

				//clearing, then adding the en passant tile to be taken
				var valueSet = false
				var moveType = 0
				switch (board[oldY][oldX][0]) {
					case 1:
					//pawn
						//Adding en passant tile
						if (Math.abs(y - oldY) == 2) {
							enPassant = []
							enPassant.push(oldY+(2* Math.abs(turn % 2 - bottomColour) - 1))
							enPassant.push(x)
							valueSet = true
							moveType = 2
						}
						//marking en passant capture in move history
						if (sameArray(coords, enPassant)) {
							moveType = 1
						}
						if (y == 0 || y == board.length-1) {
							//marking promotion
							moveType = 6
						}
					break;
					//castling
					case 6:
						//king disable
						castling[turn % 2][2] = 0
						moveType = 5
					break;
					case 4:
						//rook disable
						//7 * NOT colour
						//white is 0 with y of 7, black is 1 with y of 0
						if (board[oldY][oldselection[1]][0] == 4) {
							if (oldY == 7*(-1*Math.abs(turn % 2 - bottomColour) + 1) && (oldX == 0 || oldX == board[oldY].length - 1)) {
								//NOT oldX / 7 but only if bottomColour is 1
								castling[turn % 2][Math.abs((oldX / 7) - bottomColour)] = 0
								moveType = 3 + Math.abs((oldX / 7) - bottomColour)
							}
						}
					break;
					case 7:
						//dragon
					break;
				}

				moveHistory.push([oldselection, coords, board[y][x][0], moveType])
				//console.log(moveType)
				board = movePiece(oldselection, coords)

				// If en passant was not done, it is cleared after the next move
				if (valueSet == false) {
					enPassant = []
				}
				turn ++
				legalMoves = []
				drawBoard()

			var moveFound = gameEndCheck(gamemode)

			//flipping board if player is playing against themself and the game has not ended
			if (singleplayer && moveFound) {
				flipBoard(true)
			}
		}
		else if (((oldselection[0] !== y || oldselection[1] !== x) && board[y][x][1] == turn % 2) && coords !== -1) {
			//maybe this should be checking for whether or not there are no legal moves, watch out for any potential errors
			drawBoard()
			var selectedPiece = board[y][x]
			if (typeof selectedPiece === 'object') {
				//Help from Ms Downie in identifying that I needed a second '='. I hate these = == and ===
				//Checks the colour of the piece against the turn counter
				if (turn % 2 == selectedPiece[1]) {
					var possibleMoves = getPossibleMoves(coords)

					oldselection = coords
					legalMoves = getLegalMoves(possibleMoves, oldselection)
					for (var i = 0; i < legalMoves.length; i++) {
						drawSquare(legalMoves[i][0],legalMoves[i][1],(legalMoves[i][0]+legalMoves[i][1]),true)
					}
				}
			}
		}
		else {
			drawBoard()
			oldselection = []
			legalMoves = []
		}
	}
}

function findClick(clickEvent) {
	//information about size and location relative to the browser, returns -1 if click is outside of the canvas
	const canvasInfo = document.getElementById("game").getBoundingClientRect()
	//getBoundingClientRect includes the border but getElementById does not. The difference is double the border width (both sides of the rectangle) which fixes the offset
	const borderSize = (canvasInfo.width - document.getElementById("game").width) / 2

	//event gives you the coordinate of the click on the entire browser. this removes the non-canvas parts of the browser from the coordinates
	//dividing the pixels by the tile size returns the index of the square clicked on
	var x = Math.trunc((clickEvent.clientX - borderSize - canvasInfo.x)/tile);
    var y = Math.trunc((clickEvent.clientY - borderSize - canvasInfo.y)/tile);
	var coords = [y,x]
	//out of bounds check
	if (clickEvent.clientY > canvasInfo.bottom || clickEvent.clientY < canvasInfo.top || clickEvent.clientX > canvasInfo.right || clickEvent.clientX < canvasInfo.left) {
		coords = -1
	}
	return coords
}

function gameEndCheck(gamemode) {
	//moved into a function
	//checking if next turn player has any legal moves. If none, checks if king is in check
	var moves = null
	var moveFound = false
	for (var i = 0; i < board.length && moveFound == false; i++) {
		for (var j = 0; j < board[i].length; j++) {
			if (typeof board[i][j] == 'object') {
				if (board[i][j][1] == turn % 2) {
					var index = [i,j]
					moves = getLegalMoves(getPossibleMoves(index),index)
					if (moves.length > 0) {
						moveFound = true
					}
				}
			} 
		}
	}
	if (moveFound == false) {
		if (inCheck(board)) {
			//2 is black win, 3 is white win
			gameState = 2 + turn % 2
		}
		else {
			//stalemate
			gameState = 4
		}
	}
	if (gameState != 0) {
		switch(gameState){
			case 2:
				//alert("Checkmate! Black wins!");
				document.getElementById("status").innerHTML = "Checkmate"
			break;
			case 3:
				//alert("Checkmate! White wins!");
				document.getElementById("status").innerHTML = "Checkmate"
			break;
			case 4:
				//alert("Stalemate! Nobody wins!");
				document.getElementById("status").innerHTML = "Stalemate"
			break;
		}
	}
	return moveFound
}

function getPossibleMoves(index) {
	var y = index[0]
	var x = index[1]
	var pieceType = board[y][x]
	var colour = board[y][x][1]
	var possibleMoves = []
	switch(pieceType[0]) {
		case 1:
			//pawn
			possibleMoves = pawn(possibleMoves, y, x, colour, board, false)
		break;
		case 2:
			//bishop
			possibleMoves = bishop(possibleMoves, y, x, colour, board, false)
		break;
		case 3:
			//knight
			possibleMoves = knight(possibleMoves, y, x, colour, board, false)
		break;
		case 4:
			//rook
			possibleMoves = rook(possibleMoves, y, x, colour, board, false)
		break;
		case 5:
			//queen
			//bishop half
			possibleMoves = bishop(possibleMoves, y, x, colour, board, false)
			//rook half
			possibleMoves = rook(possibleMoves, y, x, colour, board, false)
		break;
		case 6:
			//king
			possibleMoves = king(possibleMoves, y, x, colour, board, false)
		break;
		case 7:
			//dragon
			possibleMoves = dragon(possibleMoves, y, x, colour, board, false)
		break;
	}
	return possibleMoves
}
function pawn(possibleMoves, y, x, colour, board, checkCall) {
	var foundCheck = false
	moveDirection = Math.abs(colour - bottomColour)
	//-x + 1 turns 0 into 1, and 1 into 0 (NOT)
	//used to have 5 instead of board.length - 3, but this is compatible with non-square boards
	if (1 + (board.length - 3) * (-1 * (moveDirection) + 1) == y) {
		//2x - 1 turns 0 into -1, and 1 into 1
		if ((typeof board[y+(2*(moveDirection) - 1)][x]) !== 'object') {
			possibleMoves.push([(y+(2*(moveDirection) - 1)),x])
			//4x - 2 turns 0 into -2, and 1 into 2
			if ((typeof board[y+(4*(moveDirection) - 2)][x]) !== 'object') {
				possibleMoves.push([(y+(4*(moveDirection) - 2)),x])
			}
		}
	}
	else if (typeof board[y+(2*(moveDirection) - 1)][x] !== 'object') {
		possibleMoves.push([(y+(2*(moveDirection) - 1)),x])
	}
	//Diagonal piece capture
	for (var i = -1; i <= 1; i = i + 2) {
		if (x + i < board[y].length + 1 && x + i >= 0) {
			if ((typeof board[y+(2*(moveDirection) - 1)][x+i]) === 'object') {
				if (board[y+(2*(moveDirection) - 1)][x+i][1] !== colour) {
					possibleMoves.push([(y + 2*(moveDirection) - 1),(x + i)])
					if (board[y+(2*(moveDirection) - 1)][x+i][0] == 1) {
						foundCheck = true
					}
				}
			}
			else if (y+(2*(moveDirection) - 1) == enPassant[0] && x+i == enPassant[1]) {
				//en passant
				possibleMoves.push([(y + 2*(moveDirection) - 1),(x + i)])
			}
		}
	}
	if(checkCall) {
		return foundCheck
	}
	else {
		return possibleMoves
	}
}
function knight(possibleMoves, y, x, colour, board, checkCall) {
	var foundCheck = false
	for (var i = -1; i <= 2; i = i + 3) {
		for (var j = -2; j <= 1; j = j + 3) {
			// removes diagonals
			if (Math.abs(i) !== Math.abs(j)) {
				// + + quadrant
				if (y + i >= 0 && y + i < board.length && x + j >= 0 && x + j < board[y].length) {
					if (typeof board[y+i][x+j] !== 'object') {
						possibleMoves.push([y+i,x+j])
					}
					else if (board[y+i][x+j][1] !== colour) {
						possibleMoves.push([y+i,x+j])
						if (board[y+i][x+j][0] == 3) {
							foundCheck = true
						}
					}
				}
				// - - quadrant
				if (y - i >= 0 && y - i < board.length && x - j >= 0 && x - j < board[y].length) {
					if (typeof board[y-i][x-j] !== 'object') {
						possibleMoves.push([y-i,x-j]) 
					}
					else if (board[y-i][x-j][1] !== colour) {
						possibleMoves.push([y-i,x-j])
						if (board[y-i][x-j][0] == 3) {
							foundCheck = true
						}
					}
				}
				// - + quadrant
				if (y + i >= 0 && y + i < board.length && x - j >= 0 && x - j < board[y].length) {
					if (typeof board[y+i][x-j] !== 'object') {
						possibleMoves.push([y+i,x-j])
					}
					else if (board[y+i][x-j][1] !== colour) {
						possibleMoves.push([y+i,x-j])
						if (board[y+i][x-j][0] == 3) {
							foundCheck = true
						}
					}
				}
				// + - quadrant
				if (y - i >= 0 && y - i < board.length && x + j >= 0 && x + j < board[y].length) {
					if (typeof board[y-i][x+j] !== 'object') {
						possibleMoves.push([y-i,x+j]) 
					}
					else if (board[y-i][x+j][1] !== colour) {
						possibleMoves.push([y-i,x+j])
						if (board[y-i][x+j][0] == 3) {
							foundCheck = true
						}
					}
				}
			}
		}
	}
	if(checkCall) {
		return foundCheck
	}
	else {
		return possibleMoves
	}
}
function bishop (possibleMoves, y, x, colour, board,checkCall) {
	var foundCheck = false
	var stopped = false
	//bottom right
	//the second condition used to be a while loop with the third at the end of each block
	for (var i = 1; y + i < board.length && x + i < board[y].length && stopped === false; i++) {
		if (typeof board[y+i][x+i] !== 'object') {
			possibleMoves.push([(y + i),(x + i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y+i][x+i][1] !== colour) {
				possibleMoves.push([(y + i),(x + i)])
				if (board[y+i][x+i][0] == 2 || board[y+i][x+i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//bottom left
	for (var i = 1; y + i < board.length && x - i >= 0 && stopped === false; i++) {
		if (typeof board[y+i][x-i] !== 'object') {
			possibleMoves.push([(y + i),(x - i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y+i][x-i][1] !== colour) {
				possibleMoves.push([(y + i),(x - i)])
				if (board[y+i][x-i][0] == 2 || board[y+i][x-i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//top left
	for (var i = 1; y - i >= 0 && x - i >= 0 && stopped === false; i++) {
		if (typeof board[y-i][x-i] !== 'object') {
			possibleMoves.push([(y - i),(x - i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y-i][x-i][1] !== colour) {
				possibleMoves.push([(y - i),(x - i)])
				if (board[y-i][x-i][0] == 2 || board[y-i][x-i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//top right
	for (var i = 1; y - i >= 0 && x + i < board[y].length && stopped === false; i++) {
		if (typeof board[y-i][x+i] !== 'object') {
			possibleMoves.push([(y - i),(x + i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y-i][x+i][1] !== colour) {
			possibleMoves.push([(y - i),(x + i)])
				if (board[y-i][x+i][0] == 2 || board[y-i][x+i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}	
	}
	if(checkCall) {
		return foundCheck
	}
	else {
		return possibleMoves
	}
}
function rook (possibleMoves, y, x, colour, board, checkCall) {
	var foundCheck = false
	var stopped = false
	//the second condition used to be a while loop with the third at the end of each block
	//down
	for (var i = 1; y + i < board.length && stopped === false; i++) {
		if (typeof board[y+i][x] !== 'object') {
			possibleMoves.push([(y + i),(x)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y+i][x][1] !== colour) {
				possibleMoves.push([(y + i),(x)])
				if (board[y+i][x][0] == 4 || board[y+i][x][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//right
	for (var i = 1; x + i < board[y].length && stopped === false; i++) {
		if (typeof board[y][x+i] !== 'object') {
			possibleMoves.push([(y),(x + i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y][x+i][1] !== colour) {
				possibleMoves.push([(y),(x + i)])
				if (board[y][x+i][0] == 4 || board[y][x+i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//up
	for (var i = 1; y - i >= 0 && stopped === false; i++) {
		if (typeof board[y-i][x] !== 'object') {
			possibleMoves.push([(y - i),(x)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y-i][x][1] !== colour) {
				possibleMoves.push([(y - i),(x)])
				if (board[y-i][x][0] == 4 || board[y-i][x][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	var stopped = false
	//left
	for (var i = 1; x - i >= 0 && stopped === false; i++) {
		if (typeof board[y][x-i] !== 'object') {
			possibleMoves.push([(y),(x - i)])
		}
		else {
			//stop moving when a piece is encountered
			if (board[y][x-i][1] !== colour) {
				possibleMoves.push([(y),(x - i)])
				if (board[y][x-i][0] == 4 || board[y][x-i][0] == 5) {
					foundCheck = true
				}
			}
			stopped = true
		}
	}
	if(checkCall) {
		return foundCheck
	}
	else {
		return possibleMoves
	}
}
// queen is just bishop and rook
function king(possibleMoves, y, x, colour, board, checkCall) {
	var foundCheck = false
	//A very simple adjacent tiles check. The hard part comes in getLegalMoves
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			if (i != 0 || j != 0) {
				if (y + i < board.length && y + i >= 0 && x + j < board[y].length && x + j >= 0) {
					if (typeof board[y+i][x+j] !== 'object') {
						possibleMoves.push([y+i,x+j])
					}
					else if (board[y+i][x+j][1] !== colour) {
						possibleMoves.push([y+i,x+j])
						if (board[y+i][x+j][0] == 6) {
							foundCheck = true
						}
					}
				}
			}
		}
	}
	//preventing stackoverflow error caused by referencing inCheck in the king function
	if (!checkCall) {
		if (inCheck(board) == false) {
			//castling
			//second index used to be 0 and 1, but this way if board is flipped the referenced rook is also flipped
			//move in the opposite direction if board is flipped
			var moveDirection = -2 * bottomColour + 1
			//queen side
			if (castling[turn % 2][0] == 1 && castling[turn % 2][2] == 1) {
				var unobstructed = true
				//checking if there are any pieces between the casting pieces
				for (i = 1; i < 4; i++) {
					if (typeof board[y][x-i * moveDirection] === 'object') {
						unobstructed = false
					}
				}
				if (unobstructed) {
					//checking if the inbetween square is seen by an enemy piece
					if (inCheck(movePiece([y,x],[y,x-1 * moveDirection])) == false) {
						possibleMoves.push([y,x-2 * moveDirection])
					}
				}
			}
			//king side
			if (castling[turn % 2][1] == 1 && castling[turn % 2][2] == 1) {
				var unobstructed = true
				for (i = 1; i < 3; i++) {
					if (typeof board[y][x+i * moveDirection] === 'object') {
						unobstructed = false
					}
				}
				if (unobstructed) {
					if (inCheck(movePiece([y,x],[y,x+1 * moveDirection])) == false) {
						possibleMoves.push([y,x+2 * moveDirection])
					}
				}
			}
		}
	}
	if(checkCall) {return foundCheck}
	else {return possibleMoves}
}
function dragon(possibleMoves, y, x, colour, board, checkCall) {
	var foundCheck = false
	for (var i = -3; i <= 3; i += 1) {
		if(checkCall || i%2 !== 0 || true) {
			if (y + i < board.length && y + i >= 0) {
				if (typeof board[y+i][x] !== 'object') {
					possibleMoves.push([y+i,x])
				}
				else if (board[y+i][x][1] !== colour) {
					possibleMoves.push([y+i,x])
					if (board[y+i][x][0] == 7) {
						foundCheck = true
					}
				}
			}
			if (x + i < board[y].length && x + i >= 0) {
				if (typeof board[y][x+i] !== 'object') {
					possibleMoves.push([y,x+i])
				}
				else if (board[y][x+i][1] !== colour) {
					possibleMoves.push([y,x+i])
					if (board[y][x+i][0] == 7) {
						foundCheck = true
					}
				}
			}
		}
	}
	for (var i = -1; i <= 1; i += 2) {
		for (var j = -1; j <= 1; j += 2) {
			if (y + i > 0 && y + i < board.length) {
				if (x + j > 0 && x + j < board[y].length) {
					if (typeof board[y+i][x+j] !== 'object') {
						possibleMoves.push([y+i,x+j])
					}
					else if (board[y+i][x+j][1] !== colour) {
						possibleMoves.push([y+i,x+j])
						if (board[y+i][x+j][0] == 7) {
							foundCheck = true
						}
					}
				}
			}
		}
	}
	if(checkCall) {
		return foundCheck
	}
	else {
		return possibleMoves
	}
}

function getLegalMoves(possibleMoves, oldselection) {
	var legalMoves = []
	for (var i = 0; i < possibleMoves.length; i++) {
		let newBoard = movePiece(oldselection, possibleMoves[i])
		if (inCheck(newBoard) == false) {
			legalMoves.push(possibleMoves[i])
		}
	}
	return legalMoves
}

function movePiece(oldPosition, newPosition) {
	var y = newPosition[0]
	var x = newPosition[1]

	var oldY = oldPosition[0]
	var oldX = oldPosition[1]

	var tempBoard = []
	//For some reason objects are much harder to create copies of, the new one will just reference but not clone the global board unless I copy each and every entry one by one.
	for (var i = 0; i < board.length; i++) {
		tempBoard.push([])
		for (var j = 0; j < board[i].length; j++) {
			tempBoard[i].push([])
			if(typeof board[i][j] == 'object') {
				//console.log('here')
				tempBoard[i][j].push(board[i][j][0])
				tempBoard[i][j].push(board[i][j][1])
			}
			else {
				tempBoard[i][j] = 0
			}
		}
	}

	switch(tempBoard[oldY][oldX][0]) {
		case 1:
			//if en passant, removing the piece behind the pawn
			//y + NOT NOT colour 
			if (y == enPassant[0] && x == enPassant[1]) {
			tempBoard[y+(-2*Math.abs(turn % 2 - bottomColour) + 1)][x] = 0
			}
			//promotion
			else if (y == 0 || y == tempBoard.length - 1) {
				tempBoard[oldY][oldX][0] = 5
			}
		break;
		case 6:
			//castling
			//checking if king moved 2 tiles
			if (Math.abs(x - oldX) == 2) {
				//checking if king went right or left
				if (x > oldX) {
					tempBoard[y][oldX+1] = tempBoard[y][tempBoard[y].length-1]
					tempBoard[y][tempBoard[y].length-1] = 0
				}
				else {
					tempBoard[y][oldX-1] = tempBoard[y][0]
					tempBoard[y][0] = 0
				}
			}
		break;
		case 7:
			//taking inbetween pieces
			if (Math.abs(x - oldX) > 1) {
				for (var i = oldX - x; i != 0; i += (x - oldX) / Math.abs(x - oldX)) {
					if (typeof tempBoard[y][x+i] == 'object') {
						if (tempBoard[y][x+i][1] != turn%2) {
							tempBoard[y][x+i] = 0
						}
					}
				}
			}
			if (Math.abs(y - oldY) > 1) {
				for (var i = oldY - y; i != 0; i += (y - oldY) / Math.abs(y - oldY)) {
					if (typeof tempBoard[y+i][x] == 'object') {
						if (tempBoard[y+i][x][1] != turn%2) {
							tempBoard[y+i][x] = 0
						}
					}
				}
			}
		break;
	}

	//Moving the piece
	tempBoard[y][x] = tempBoard[oldY][oldX]
	tempBoard[oldY][oldX] = 0

	return tempBoard
}

function inCheck(tempBoard) {
	//Checks if the king is in danger in a given board
	var colour = turn % 2
	//get coordinates of king
	var y;
	var x;
	//getting the coordinates of the relevant king
	var located = false;
	for (var i = 0; i < tempBoard.length && located == false; i++) {
		for (var j = 0; j < tempBoard[i].length && located == false; j++) {
			if (tempBoard[i][j][0] == 6) {
				if (tempBoard[i][j][1] == colour) {
					y = i
					x = j
					located = true
					}
				}
			}
		}
	var foundCheck = false
	if (located == true) {	
		//pawn
			if(pawn([], y, x, colour, tempBoard, true)) {
				foundCheck = true
			}
		//king 
			if(king([], y, x, colour, tempBoard, true)) {
				foundCheck = true
			}
		//knight
			if(knight([], y, x, colour, tempBoard, true)) {
				foundCheck = true
			}
		//bishop/queen
			if(bishop([], y, x, colour, tempBoard, true)) {
				foundCheck = true
			}
		//rook/queen
			if(rook([], y, x, colour, tempBoard, true)) {
				foundCheck = true
			}
		//dragon
			if (gamemode == 1) {
				if(dragon([], y, x, colour, tempBoard, true)) {
					foundCheck = true
				}
			}
	}
	return foundCheck
}

var board = genBoard(gamemode)
resizeCanvas(board)
drawBoard()