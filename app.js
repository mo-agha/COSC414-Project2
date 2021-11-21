var vertexShaderText = [
'precision mediump float;',

'attribute vec3 vertPosition;',

'void main()',
'{',
'	gl_Position = vec4(vertPosition, 1.0);',
'}'
].join('\n');

var fragmentShaderText = 
[
'precision mediump float;',

'uniform vec4 fragColor;',

'void main()',
'{',

' gl_FragColor = fragColor;',
'}'
].join('\n');

var demo = function() {

	//////////////////////////////////
	//       initialize WebGL       //
	//////////////////////////////////

	console.log('this is working');

	var canvas = document.getElementById('surface');
	var gl = canvas.getContext('webgl');

	if (!gl){
		console.log('webgl not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}
	if (!gl){
		alert('your browser does not support webgl');
	}

	gl.viewport(0,0,canvas.width,canvas.height);

	//////////////////////////////////
	// create/compile/link shaders  //
	//////////////////////////////////

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)){
		console.error('Error compiling vertex shader!', gl.getShaderInfoLog(vertexShader))
		return;
	}
	gl.compileShader(fragmentShader);
	if(!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)){
		console.error('Error compiling vertex shader!', gl.getShaderInfoLog(fragmentShader))
		return;
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	gl.linkProgram(program);
	if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
		console.error('Error linking program!', gl.getProgramInfo(program));
		return;
	}

	//Enable depth test to properly update depth buffer - bacteria shows on surface, not behind
	gl.enable(gl.DEPTH_TEST);

	//////////////////////////////////
	//         create buffer        //
	//////////////////////////////////

	var triangleVertexBufferObject = gl.createBuffer();
	//set the active buffer to the triangle buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);

	var positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
	
	var fragmentColor = gl.getUniformLocation(program, "fragColor");

	gl.vertexAttribPointer(
		positionAttribLocation, //attribute location
		2, //number of elements per attribute
		gl.FLOAT, 
		false, 
		0*Float32Array.BYTES_PER_ELEMENT, 
		0*Float32Array.BYTES_PER_ELEMENT
		);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.useProgram(program);

	//////////////////////////////////
	//            Drawing           //
	//////////////////////////////////

	function drawSurface(x_coord,y_coord,radius, surFaceColor) {

		var diskVertices = [];

		for (let i = 1; i <= 360; i++) {

			diskVertices.push(x_coord);
			diskVertices.push(y_coord);

			diskVertices.push(radius*Math.cos(i)+x_coord);
			diskVertices.push(radius*Math.sin(i)+y_coord);

			diskVertices.push(radius*Math.cos(i+1)+x_coord);
			diskVertices.push(radius*Math.sin(i+1)+y_coord);
		}

		//gl expecting Float32 Array not Float64
		//gl.STATIC_DRAW means we send the data only once (the triangle vertex position
		//will not change over time)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diskVertices), gl.STATIC_DRAW);
		//fragmentColor variable holds surface color information
		gl.uniform4f(fragmentColor, surFaceColor[0], surFaceColor[1], surFaceColor[2], surFaceColor[3]);

		//Note: Clearing color buffer not necessary since we pass surfaceColor in uniform4f function.
		//----- If we clear the color buffer, bacteria color doesn't properly show
		//gl.clearColor(1.0, 1.0, 1.0, 1.0);
		//gl.clear(gl.COLOR_BUFFER_BIT);

		//Draw triangles (skip 0 vertices, and draw 360 vertices 3 times to form a complete disk)
		//Note: Tested out drawing 360 vertices 1 and 2 times to see the difference in disk formation.
		gl.drawArrays(gl.TRIANGLES, 0, 360*3);

	}

	//Total lives in a game (2 per project requirement feature 8)
	var lives = 2;
	//array that holds numbers of bacteria to be generated in a game
	var toGenerate = [10, 12, 14, 16, 18, 20];
	var randomInt = Math.floor(Math.random() * 6);
	//total number of bacteria is a fixed number (max 10 bacteria at any point in the game)
	var numBacteria = 10;
	//variable that holds number of bacteria to be clicked in order to win
	var toWin = toGenerate[randomInt];
	var bacteriaLeft = toWin;
	//holds total score in a game
	var totalScore = 0;
	//counts number of generated bacteria
	var generated = 0;
	//array that holds bacteria objects
	var bacteria = [];
	// image for html
	var bacimg = document.createElement("bacimg");
	bacimg.src = "bacteria.png";
	var src = document.getElementById("bacteria");
	src.append(bacimg);

	//Bacteria class that holds methods for creating bacteria at random locations, updating, and destroying bacteria objects
	class Bacteria {
		// Get random values for variables determining x and y coordinates
		getRandomGenerationCoords() {
			//get a random angle
			this.angle = Math.random();
			//get random signs for x and y coordinates
			this.randomX = plusOrMinus(0.78);
			this.randomY = plusOrMinus(0.78);
			this.trigonometry = sinOrCos;
			if (this.trigonometry == "sin") {
				this.x_coord = this.randomX*Math.sin(this.angle);
				this.y_coord = this.randomY*Math.cos(this.angle);
			} else {
				this.x_coord = this.randomX*Math.cos(this.angle);
				this.y_coord = this.randomY*Math.sin(this.angle);
			}
		}
		generate() {
			//getRandom x and y coordinates 
			this.getRandomGenerationCoords();
			//stores new radius for new bacteria (starts at 0.02 and grows)
			this.radius = 0.02;
			//holds random color multiplied by half to ensure different colors between bacteria and surface disk
			this.color = [Math.random() * (0.5), Math.random() * (0.5), Math.random() * (0.5), 1.0];
			//holds living condition for new bacteria, starts as true and if destroyed later on, turns to false
			this.living = true;
			//Increases with each new bacteria generated
			generated++;
		}
		refreshState() {
			if(this.living) {
				// set threshold to 0.25, if bacteria reaches set threshold, player loses life and bacteria is killed.
				if(this.radius > 0.25) {
					lives--;
					//every bacteria that reaches the threshold is destroyed, removes a life, and decrease score by 50
					totalScore-=50;
					this.kill(bacteria.indexOf(this));
				} else {
					// radius increases by 0.0005 as state refreshes.
					this.radius += 0.0005;
				}
				// Draw
				drawSurface(this.x_coord, this.y_coord, this.radius, this.color);
			}
		}

		kill(id) {
			//Change radius and xy coordinates of bacteria to zero
			this.radius = 0;
			this.x_coord = 0;
			this.y_coord = 0;
			//bacteria is dead
			this.living = false;
			bacteriaLeft--;
			//delete bacteria from array to make space for new ones
			bacteria.splice(id,1);
			//if bacteriaLeft is > 10 after killing a bacteria, add and generate new bacteria
			if(bacteriaLeft >= numBacteria) {
				bacteria.push(new Bacteria(generated));
				bacteria[numBacteria-1].generate();
			}
		}

	} 

	//get a positive or negative sign for random x and y coordinates
	function plusOrMinus(num){
		if(Math.random() < 0.5){
			num*=-1;
		}
		return num;
	}

	//get random sin or cos value for random trigonometry when generating new bacteria
	function sinOrCos(trigValue){
		if(Math.random() < 0.5){
			trigValue = "sin";
		}
		else{
			trigValue = "cos";
		}
		return trigValue;
	}

	//General function for distance between 2 points
	function distance(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
	}

	//listens to mouse clicks on game surface
	canvas.onmousedown = function(e, canvas){click(e, surface);};

	// Function click
	function click(e, canvas) {
		let x = e.clientX;
		let y = e.clientY;
		//Grab webgl coords as x and y coordinates
		const rect = e.target.getBoundingClientRect();
		x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
		y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
		let clicked = false;
		let addedScore = 0;
		// Loop through all bacteria and check if you clicked within the radius of any
		// Increase score and destroy the bacteria
		for(let i in bacteria) {
			//compare distance between mouse click and bacteria xy coordinates, be within within bacteria radius
			if(distance(x, y, bacteria[i].x_coord, bacteria[i].y_coord) - (0 + bacteria[i].radius) < 0){
				//score added per accurate click is equal to 2/bacteria's radius.
				addedScore = Math.floor(2/bacteria[i].radius);
				//update total score everytime we click with added score
				totalScore += addedScore;
				//kill bacteria clicked
				bacteria[i].kill(i);
				clicked = true;
			 	//break the loop to ensure only 1 bacteria is killed every click
			 	break;
			 }
		}
		// Every click missed decreases total score by 10 points
		if(!clicked && bacteriaLeft != 0) {
			totalScore -= (10);
		}
	}	

	// Loop to add new bacteria to array and generate, < numBacteria so we have 10 max bacteria at once
	for(var i = 0; i<numBacteria; i++){
		bacteria.push(new Bacteria(generated));
		bacteria[i].generate();
	}

	//if player still has lives and there is no more bacteria left, player wins
	function win(){
		 if(lives > 0 && bacteriaLeft <= 0) {
			document.getElementById("status").innerHTML="You Win!";
		 	return true;
		 }
		return false;
	}

	//if player has no more lives left, player loses
	function loss(){
		if(lives <= 0) {
			document.getElementById("status").innerHTML="Game Over!";
			return true;
		}
		return false;
	}

	// Main Loop that runs the game and updates html values on screen
	function main() {
		
		document.getElementById("lives").innerHTML= "Remaining Lives: " + lives;
		document.getElementById("score").innerHTML= "Score: " + totalScore;
		document.getElementById("bacteria").innerHTML= "Remaining Bacteria: " + bacteriaLeft;
		//If game isn't won and player still has lives, game continues 
		if(!win() && lives > 0) {
			for (let i in bacteria) {
				bacteria[i].refreshState();
				//if player has no more lives, bacteria left is set to 0 and loop breaks 
					if (loss()) {
						bacteriaLeft = 0;
						break;
					}
				}
				loss();
			}
		drawSurface(0,0,0.8,[0.6, 0.8, 1.0, 1.0]);
		requestAnimationFrame(main);
	}
	requestAnimationFrame(main);
}