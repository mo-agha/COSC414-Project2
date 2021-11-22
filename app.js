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
  var bacteriaRemaining = Math.floor(Math.random() * (20 - 10 + 1) + 10);;
  var score = 0;
  var bacAlive = 0;
  let listofbacteria = [];
  var canvas = document.getElementById('game-surface');

  document.body.style.margin = 0;
  canvas.width = 1000;
  canvas.height = 800;

  let clarity = 4;

  // info for the sphere upon which rotation will occur
  let rotationsphere = {
    middle: vec2.fromValues(canvas.width / 2, canvas.height / 2),
    r: (Math.min(canvas.width, canvas.height) - 10) / 2.0
  };

  // WebGL Initialization
  let gl = canvas.getContext("webgl");

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  var uniforms = [
    "modelMatrix",
    "viewMatrix",
    "projectionMatrix",

    "one_colour",
    "single_colour",
  ];

  var attributes = [
    "point",
    "colour",
    "normal"
  ];

  // Creation of the GL environment
  let glEnv = new GLEnvironment(gl,
      vertexShaderCode, fragmentShaderCode,
      uniforms, attributes);

  gl.useProgram(glEnv.shader);
  gl.uniform1f(glEnv.uniforms.one_colour, 0.0);

  let ball = new Sphere(glEnv, clarity);

  let lookFrom = [0.0, 0.0, 3.0];
  let lookAt = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];

  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, lookFrom, lookAt, up);
 
  var fov = glMatrix.toRadian(60);
  var width = canvas.width;
  var height = canvas.height;
  var aspect = width/height;
  var near = 0.1;
  var far = 100.0;

  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  // Creates a set of ids for the bacterium. will be used in later meth
  let setOfBacIds = new Set();
  for (var i = 0; i < maximumBacterium; i++) {
    setOfBacIds.add(i);
  }

  maximumBacterium = setOfBacIds.size;

  // Map for bacteria colours
  var ColourMap = new Map();

  var aIterator = setOfBacIds.entries();

  // Assign colours to each bacterium id
  for (let i = 0; i < setOfBacIds.size; i++) {
    let stop = [0.2, 0.2, 0.8];
    let start = [0.5, 0.3, 0.1];

    ColourMap.set(aIterator.next().value[0], [
      vec4.fromValues(start[0], start[1], start[2], 1.0),
      vec4.fromValues(stop[0], stop[1], stop[2], 1.0)
    ]);
  }

  // Add mouse handlers to Canvas
  canvas.addEventListener('click', destroy());
  canvas.addEventListener('mousemove', mouseMove());
  canvas.addEventListener('mousedown', mouseDown());
  canvas.addEventListener('mouseup', mouseUp());

  // prevents the menu that pops up when right clicking from popping up
  document.oncontextmenu = function() {
    return false;
  }

  draw();

  // Draw Function
  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(glEnv.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(glEnv.uniforms.projectionMatrix, false,
                        projectionMatrix);

    ball.draw();

    listofbacteria.forEach(function(bacteria){bacteria.draw();});
  }

  // False draw function used for hit detection
  function falseDraw() {
    gl.uniform1f(glEnv.uniforms.one_colour, 1.0);
    draw();
    gl.uniform1f(glEnv.uniforms.one_colour, 0.0);
  }

  // Getting the next id from the bacteriumIds
  function nextId() {
    let set2array = Array.from(setOfBacIds);
    let id = set2array[Math.floor(Math.random() * set2array.length)];
    setOfBacIds.delete(id);
    return id;
  }

  // Function to spawn bacterium
  function CreateBac() {
    let frequency = 55;
    let radius = 0.05;

    // Chance based on frequency to spawn bacteria
    if (Math.random() < 1.0 / frequency && listofbacteria.length < maximumBacterium) {
      let r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      let id = nextId();
      let colours = ColourMap.get(id);
      
        let bacteria = new Sphere(glEnv, clarity, r, radius, colours[0], colours[1],);
        bacteria.id = id;

        let pole = vec3.fromValues(0.0, 0.0, 1.0);

        if (!vec3.equals(r, pole)) {
          let axis = vec3.cross(vec3.create(), pole, r);
          vec3.normalize(axis, axis);

          let angle = Math.acos(vec3.dot(pole, r));
          bacteria.rotation = mat4.rotate(mat4.create(), mat4.create(),
                                          angle, axis);
          bacteria.buildModel();
        }
        bacAlive++;
        listofbacteria.push(bacteria);
      
    }
  }

  // Function to grow bacteria on each tick
  function GrowPerTick() {
    let incrementalval = 0.0005;
    let increment = vec3.fromValues(incrementalval, incrementalval, incrementalval);
    let maxgrowth = incrementalval *  5000;

    listofbacteria.forEach(function(bacteria){
      if (bacteria.scale[0] < maxgrowth) {
        bacteria.radius += incrementalval;
        vec3.add(bacteria.scale, bacteria.scale, increment);
        bacteria.buildModel();
      }

      // If bacteria exceeds a limit of r=0.40, destroy and dec lives
      if(bacteria.radius >= 0.40) {
        let id = bacteria.id;
        bacAlive--;
        lives--;
        listofbacteria.splice(listofbacteria.indexOf(bacteria), 1);
        setOfBacIds.add(id);
      }
    });
  }

  // gameLoop function
  function mainGameLogic() {
    // Update scoreboard
    document.getElementById('scoreDisplay').innerHTML=score;
		document.getElementById('bacRemaining').innerHTML=bacteriaRemaining;
		document.getElementById('lives').innerHTML=lives;

    // Check for win or lose condition
    if(!successState()){
      if(bacteriaRemaining>0+bacAlive) {
        CreateBac();
      }
      GrowPerTick();
      draw();
      requestAnimationFrame(mainGameLogic);
    }
  }

  // Click function to destroy bacterium
  function destroy() {
    return function(event) {
      let offset = ObtainWindowOffset(event.target);
      let x = event.clientX - offset.x;
      let y = event.target.height - (event.clientY - offset.y);

      let colour = new Uint8Array(4);
      falseDraw();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      let id = ColourConverter(colour);
      let hit = false;
      let scoreInc = 0;

      for (let i = 0; i < listofbacteria.length; i++){
        if (listofbacteria[i].id == id){
          hit = true;
          scoreInc = Math.round(2/listofbacteria[i].radius);
          score += scoreInc
          bacteriaRemaining--;
          bacAlive--;
          listofbacteria.splice(i, 1);
          setOfBacIds.add(id);
          break;
        }
      }
      draw();
    };
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

          // Translate into ball.
          let transIn = mat4.translate(mat4.create(), mat4.create(),
                                            vec3.fromValues(0.0, 0.0, 3.0));

          let rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);

          // Translate out of ball.
          let transOut = mat4.translate(mat4.create(), mat4.create(),
                                             vec3.fromValues(0.0, 0.0, -3.0));


          mat4.mul(transform, transIn, transform);
          mat4.mul(transform, rot, transform);
          mat4.mul(transform, transOut, transform);
          mat4.mul(viewMatrix, transform, rotationsphere.matrix_stash);
        }
      }
    }
  }

  // Mouse up function
  function mouseUp() {
    return function(e) {
      if ((e.button) == 2){
        rotationsphere.start = undefined;
      }
    }
  }


  // Checks for win or lose depending on the bacteria remaining or lives remaining
  function successState() {
    if(bacteriaRemaining <= 0) {
      
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

// Returns distance between two points in 3D space
function distance(vec1, vec2) {
  return Math.sqrt(Math.pow(vec2[0]-vec1[0], 2) + Math.pow(vec2[1]-vec1[1], 2) + Math.pow(vec2[2]-vec1[2], 2))
}

// Normalize a vector between two points in 3D space
function normalize3DVector(vec1, vec2) {
  let m = distance(vec1, vec2);
  return[((vec1[0]-vec2[0])/m)/400, ((vec1[1]-vec2[1])/m)/400, ((vec1[2]-vec2[2])/m)/400];
}
