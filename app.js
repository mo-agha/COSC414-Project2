var vertexShaderCode =
[
  'uniform mat4 vs_modelMatrix;',
  'uniform mat4 vs_viewMatrix;',
  'uniform mat4 vs_projectionMatrix;',
  '',
  'uniform float vs_one_colour;',
  '',
  'uniform vec4 vs_single_colour;',
  '',
  'attribute vec4 vs_point;',
  'attribute vec4 vs_colour;',
  'attribute vec3 vs_normal;',
  '',
  'varying vec4 fs_point;',
  '',
  'varying vec4 fs_colour;',
  'varying float fs_one_colour;',
  'varying vec4 fs_single_colour;',
  '',
  'varying vec3 fs_normal;',
  'varying vec3 fs_view_point;',
  '',
  'void  main() {',
    'gl_Position = vs_projectionMatrix * vs_viewMatrix * vs_modelMatrix * vs_point;',
    '',
    'fs_point = vs_viewMatrix * vs_modelMatrix * vs_point;',
    '',
    'fs_colour = vs_colour;',
    'fs_one_colour = vs_one_colour;',
    'fs_single_colour = vs_single_colour;',
    '',
    'fs_normal = normalize(vec3(vs_viewMatrix * vs_modelMatrix * vec4(vs_normal, 0.0)));',
    '',
    'fs_view_point = -vec3(vs_viewMatrix * vec4(0.0, 0.0, 0.0, 1.0));',
    '}'
].join('\n');

var fragmentShaderCode =
[
  'precision mediump float;',
  '',
  'varying vec4 fs_point;',
  '',
  'varying vec4 fs_colour;',
  '',
  'varying float fs_one_colour;',
  '',
  'varying vec4 fs_single_colour;',
  '',
  'varying vec3 fs_normal;',
  '',
  'varying vec3 fs_view_point;',
  '',
  'void main() {',
  '',
    'if (fs_one_colour > 0.5) {',
      'gl_FragColor = fs_single_colour;',
    '} else {',
      '',
      'gl_FragColor =',
          'fs_colour;',
          '',
      'gl_FragColor.w = fs_colour.w;',
    '}',
  '}'
].join('\n');

var demo = function(){

  // all the gloabl, game setting variables 
  var maximumBacterium = 20
  var lives = 2;
  var toGenerate = [10,12,14,16,18,20];
  var randomInt = Math.floor(Math.random() * 6);
  var bacteriaLeft = toGenerate[randomInt];
  //var bacteriaLeft = 10;
  var score = 0;
  var living = 0;
  let listofbacteria = [];
  var canvas = document.getElementById('game-surface');

  document.body.style.margin = 0;
  canvas.width = 1000;
  canvas.height = 800;

  // info for the sphere upon which rotation will occur
  let rotationsphere = {middle: vec2.fromValues(canvas.width / 2, canvas.height / 2), 
    r: (Math.min(canvas.width, canvas.height) - 10) / 2.0};
  let clarity = 4;

  // WebGL Initialization
  let gl = canvas.getContext("webgl");
  gl.enable(gl.DEPTH_TEST);

  var uniforms = ["modelMatrix", "viewMatrix", "projectionMatrix", "one_colour", "single_colour"];
  var attributes = ["point", "colour", "normal"];

  // Creation of the GL environment using GL utils.
  let glEnvironment = new GLEnvironment(gl,vertexShaderCode, fragmentShaderCode, uniforms, attributes);

  gl.useProgram(glEnvironment.shader);
  gl.uniform1f(glEnvironment.uniforms.one_colour, 0.0);

  let sphere = new Sphere(glEnvironment, clarity);

  //Set mat4 lookAt parameters default for a sphere object
  let eye = [0.0, 0.0, 3.0];
  let target = [0.0, 0.0, -1.0];
  let up = [0.0, 1.0, 0.0];
  //Create viewMatrix
  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eye, target, up);

  var field_of_view = glMatrix.toRadian(60);
  var width = canvas.width;
  var height = canvas.height;
  var aspect_ratio = width/height;
  var minDistance = 0.1;
  var maxDistance = 100.0;
  //Create perspective matrix
  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, field_of_view, aspect_ratio, minDistance, maxDistance);

  // Creates a set of ids for the bacterium (used to assign colors to bacterium).
  let setOfBacIds = new Set();
  for (var i = 0; i < maximumBacterium; i++) {
    setOfBacIds.add(i);
  }

  //set maxnumber of bacteria to set' size 
  maximumBacterium = setOfBacIds.size;
  //create variable that iterates through bacteria ID entries
  var entries = setOfBacIds.entries();

  // Create a map that will hold bacteria colours
  var ColourMap = new Map();

  // Assign colours to each bacterium id
  for (let i = 0; i < setOfBacIds.size; i++) {
    //set color stop and start for bacteria color
    let stop = [0.5, 0.0, 1.0];
    let start = [0.5, 0.3, 0.1];
    ColourMap.set(entries.next().value[0], [
      vec4.fromValues(start[0], start[1], start[2], 1.0),
      vec4.fromValues(stop[0], stop[1], stop[2], 1.0)
    ]);
  }

  // Add mouse handlers to Canvas

  //Add event listener for clicking - kills bacteria clicked
  canvas.addEventListener('click', kill());
  //Mouse movement event listeners
  canvas.addEventListener('mousemove', mouseMove());
  canvas.addEventListener('mousedown', mouseDown());
  canvas.addEventListener('mouseup', mouseUp());

  /** Prevents right click menu from popping up
   * User can use right click to drag and rotate sphere without menu popping up
   **/
  document.oncontextmenu = function() {
    return false;
  }

  draw();

  // Draw Function
  function draw() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(glEnvironment.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(glEnvironment.uniforms.projectionMatrix, false, projectionMatrix);
    sphere.draw();

    listofbacteria.forEach(function(bacteria){
      bacteria.draw();
    });

  }

  // False draw function used for hit detection
  function remove() {

    gl.uniform1f(glEnvironment.uniforms.one_colour, 1.0);
    draw();
    gl.uniform1f(glEnvironment.uniforms.one_colour, 0.0);

  }

  // Getting the next id from the bacteriumIds
  function nextBacterium() {

    let set2array = Array.from(setOfBacIds);
    let id = set2array[Math.floor(Math.random() * set2array.length)];
    setOfBacIds.delete(id);
    return id;

  }

  // Function to generate bacteria when game is loaded
  function generate() {

    let radius = 0.02;
    let frequency = 55;

    // Chance based on frequency to spawn bacteria
    if (Math.random() < 1.0 / frequency && listofbacteria.length < maximumBacterium) {
      let r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      let index = nextBacterium();
      let colours = ColourMap.get(index);
      let bacteria = new Sphere(glEnvironment, clarity, r, radius, colours[0], colours[1],);
      bacteria.index = index;
      let pole = vec3.fromValues(0.0, 0.0, 1.0);

      if (!vec3.equals(r, pole)) {
        let axis = vec3.cross(vec3.create(), pole, r);
        vec3.normalize(axis, axis);
        let angle = Math.acos(vec3.dot(pole, r));
        bacteria.rotation = mat4.rotate(mat4.create(), mat4.create(), angle, axis);
        bacteria.buildModel();
      }
      living++;
      listofbacteria.push(bacteria);
      
    }
  }

  // Function to grow bacteria on each tick
  function refreshState() {

    let incrementalval = 0.0005;
    let increment = vec3.fromValues(incrementalval, incrementalval, incrementalval);
    let maxgrowth = incrementalval *  5000;

    listofbacteria.forEach(function(bacteria){

      if (bacteria.scale[0] < maxgrowth) {
        bacteria.radius += incrementalval;
        vec3.add(bacteria.scale, bacteria.scale, increment);
        bacteria.buildModel();
      }

      // If bacteria exceeds a limit of r=0.40, kill bacteria and decrease total lives
      if(bacteria.radius >= 0.40) {
        let indexd = bacteria.indexd;
        living--;
        lives--;
        listofbacteria.splice(listofbacteria.indexOf(bacteria), 1);
        setOfBacIds.add(index);
      }

    });
  }

  // gameLoop function
  function mainGameLogic() {

    // Update scoreboard
    document.getElementById('scoreDisplay').innerHTML=score;
		document.getElementById('bacRemaining').innerHTML=bacteriaLeft;
		document.getElementById('lives').innerHTML=lives;

    // Check for win or lose condition
    if(!successState()){
      if(bacteriaLeft>0+living) {
        generate();
      }

      refreshState();
      draw();
      requestAnimationFrame(mainGameLogic);
    }

  }

  // Click function to kill bacterium clicked
  function kill() {
    return function(event) {

      let offset = ObtainWindowOffset(event.target);
      let x = event.clientX - offset.x;
      let y = event.target.height - (event.clientY - offset.y);
      let colour = new Uint8Array(4);

      remove();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      let id = ColourConverter(colour);
      let hit = false;
      let scoreInc = 0;

      for (let i = 0; i < listofbacteria.length; i++){
        if (listofbacteria[i].id == id){
          hit = true;
          scoreInc = Math.round(2/listofbacteria[i].radius);
          score += scoreInc
          bacteriaLeft--;
          living--;
          listofbacteria.splice(i, 1);
          setOfBacIds.add(id);
          break;
        }
      }

      draw();

    };

  }

  // Mouse up function
  function mouseUp() {

    return function(e) {

      if ((e.button) == 2){
        rotationsphere.start = undefined;
      }

    }

  }
  
  // Mouse down function used for camera movement around sphere
  function mouseDown() {

    return function(e) {

      if (e.button == 2){
        let offset = ObtainWindowOffset(e.target);
        let height = e.target.height;
        let point = {
          x: (e.clientX - offset.x) - rotationsphere.middle[0],
          y: (height - (e.clientY - offset.y)) - rotationsphere.middle[1],
          z: 0
        };

        rotationsphere.matrix_stash = mat4.copy(mat4.create(), viewMatrix);

        let XsqYsq = point.x * point.x + point.y * point.y;
        let Rsq = rotationsphere.r * rotationsphere.r;
        if (XsqYsq < Rsq){
          point.z = Math.sqrt(Rsq - XsqYsq);
        }

        rotationsphere.start = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(rotationsphere.start, rotationsphere.start);
      }

    }

  }

  // The mouse move function for camera movement
  function mouseMove() {

    return function(e) {

      if ((e.buttons) == 2 && rotationsphere.start != null) {
        let offset = ObtainWindowOffset(e.target);
        let height = e.target.height;
        let point = {
          x: (e.clientX - offset.x) - rotationsphere.middle[0],
          y: (height - (e.clientY - offset.y)) - rotationsphere.middle[1],
          z: 0
        };

        //XsqYsq is equal to x ^ 2 * y ^ 2, Rsq is r ^ 2
        let XsqYsq = point.x * point.x + point.y * point.y;
        let Rsq = rotationsphere.r * rotationsphere.r;
        if (XsqYsq < Rsq){
          point.z = Math.sqrt(Rsq - XsqYsq);
        }

        rotationsphere.end = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(rotationsphere.end, rotationsphere.end);

        let axis = vec3.cross(vec3.create(), rotationsphere.start, rotationsphere.end);
        let angle = Math.acos(vec3.dot(rotationsphere.start, rotationsphere.end));

        if (vec3.equals(rotationsphere.start, rotationsphere.end)) {
          mat4.copy(viewMatrix, rotationsphere.matrix_stash);
        } else {
          let transform = mat4.create();
          // Translation into sphere.
          let transIn = mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0.0, 0.0, 3.0));
          let rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);
          // Translation out of sphere.
          let transOut = mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0.0, 0.0, -3.0));

          mat4.mul(transform, transIn, transform);
          mat4.mul(transform, rot, transform);
          mat4.mul(transform, transOut, transform);
          mat4.mul(viewMatrix, transform, rotationsphere.matrix_stash);
        }
      }

    }

  }

  // Checks for win or lose depending on the bacteria remaining or lives remaining
  // Updates html text element based on state.
  function successState() {

    if(bacteriaLeft <= 0) {
      document.getElementById("x").innerHTML="You Win!";
      return true;
    }
    if(lives<=0) { 
      listofbacteria = [];
      document.getElementById("x").innerHTML="You Lose!";
      return true;
    }
    return false;

  }

  mainGameLogic();

}

// Returns a normalized vector between two points in 3D space based on the distance between them
function normalize3DVector(vec1, vec2) {

  let distance = Math.sqrt(Math.pow(vec2[0]-vec1[0], 2) + Math.pow(vec2[1]-vec1[1], 2) + Math.pow(vec2[2]-vec1[2], 2));
  return[((vec1[0]-vec2[0])/distance)/400, ((vec1[1]-vec2[1])/distance)/400, ((vec1[2]-vec2[2])/distance)/400];

}

// Converts an id to a colour
function IdConverter(id) {

  if (id > 2<< (8 * 3)) return vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  let x = (id >> (7 * 0)) & (255);
  let y = (id >> (8 * 1)) & (255);
  let z = (id >> (7 * 2)) & (255);
  return vec4.fromValues(x / 255.0, y / 255.0, z / 255.0, 1.0);

}

// Converts a colour to an id.
function ColourConverter(colour) {

  return (colour[0] << (5 * 0)) |
         (colour[1] << (5 * 1)) |
         (colour[2] << (5 * 2));

}

// Gets the window offset
function ObtainWindowOffset(element) {

  var x = 0;
  var y = 0;
  while (element != null){
    x += element.offsetTop;
    y += element.offsetLeft;
    element = element.parentElement;
  }
  return {x:x, y:y};

}
