"use strict";

//Global Variables
var gl;
var program;
var colors = [];
var vertices = [];
var keysPressed = {};
var vertex_buffer;
var color_buffer;

var near = 0.5;
var far = 250.0;
var radius = 6.0;
var theta = 55.0;
var phi = 50;
var ftrack = 0;
var fov = 50;
var acc = 0.05;
var aspect;
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var x = vec2(-10, 10), z = vec2(-10, 10);

window.onload = function init() {
	//Configure WebGL
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	var canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) { alert("WebGL isn't available"); }
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	aspect = canvas.width / canvas.height;
	get_patch(x[0], x[1], z[0], z[1]);
	//console.log(vertices);
	draw();
};

function draw() {
	vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);
	color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
	var vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);
	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
	projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
	render();
}

function get_patch(xmin, xmax, zmin, zmax) {
	//Function to generate the terrain from a 2d mesh using perlin noise in the module
	var size = 0.05;
	var initialXmin = xmin;
	noise.seed(9);
	while (zmin <= zmax) {
		while (xmin <= xmax) {
			vertices.push(vec3(xmin, 0, zmin));
			vertices.push(vec3(xmin, 0, zmin + size));
			vertices.push(vec3(xmin, 0, zmin + size));
			vertices.push(vec3(xmin + size, 0, zmin));
			vertices.push(vec3(xmin + size, 0, zmin));
			vertices.push(vec3(xmin, 0, zmin));
			colors.push(vec4(1, 1, 1, 1));
			colors.push(vec4(1, 1, 1, 1));
			colors.push(vec4(1, 1, 1, 1));
			colors.push(vec4(1, 1, 1, 1));
			colors.push(vec4(1, 1, 1, 1));
			colors.push(vec4(1, 1, 1, 1));
			xmin += size;
		}
		xmin = initialXmin;
		zmin += size;
	}
	for (var i = 2; i < vertices.length - 2; i++) {
		vertices[i - 2][1] = noise.perlin2(vertices[i - 2][0], vertices[i - 2][2]);
	}
}


function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	colors = [];
	//Unomment the block below to trigger the automatic movement
	for (var k = 0; k < vertices.length; k++) {
		vertices[k][0] = vertices[k][0] - acc;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);


	//perspective view from a certain height
	eye = vec3(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta));
	modelViewMatrix = lookAt(eye, at, up);
	projectionMatrix = perspective(fov, aspect, near, far);
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
	gl.drawArrays(gl.LINES, 0, vertices.length);
	window.requestAnimFrame(render);
}

//check keyboard inputs
function handleKeyDown(e) {
	keysPressed[e.keyCode] = true;
	if (e.keyCode == 53) { 	// Near(5)
		if (ftrack > -10) {
			fov -= 1;
			ftrack -= 1;
		}
	}
	else if (e.keyCode == 54) { 	// Far(6)
		if (ftrack < 10) {
			fov += 1;
			ftrack += 1;
		}
	}
	else if (e.keyCode == 51) { 	// Top(3)
		if (at[1] < 2) {
			at[1] += 0.5;
		}
	}
	else if (e.keyCode == 52) { 	// Bottom(4)
		if (at[1] > -2) {
			at[1] -= 0.5;
		}
	}
	else if (e.keyCode == 49) { 	// Left(1)
		if (at[2] > -1) {
			at[2] -= 0.4;
		}
	}
	else if (e.keyCode == 50) { 	// Right(2)
		if (at[2] < 1) {
			at[2] += 0.4
		}
	}
	else if (e.keyCode == 27) {
		window.close();
		//console.log("quit");
		//prompt("Quit");

	}
	else if (e.keyCode == 38) {
		accelerate();
	}
	else if (e.keyCode == 81) {	// Roll left
		rollLeft();
	}
	else if (e.keyCode == 69) {	// Roll right
		rollRight();
	}
	else if (e.keyCode == 87) {	// Pitch up
		pitchUp();
	}
	else if (e.keyCode == 83) {	// Pitch down
		pitchDown();
	}
	else if (e.keyCode == 65) {	// Yaw left
		yawLeft();
	}
	else if (e.keyCode == 68) {	// Yaw right
		yawRight();
	}
	else if (e.keyCode == 40) {   // Decelerate
		decelerate();
	}
}

//movement functions
function handleKeyUp(e) {
	keysPressed[e.keyCode] = false;
}
function rollRight() {
	if (!(Math.floor(up[2]) >= 1.0))
		up[2] += 0.01;
}
function rollLeft() {
	if (!(Math.ceil(up[2]) <= -1.0))
		up[2] -= 0.01;
}
function yawRight() {
	if (!(Math.floor(at[2]) >= 1.0))
		at[2] += 0.05;
}
function yawLeft() {
	if (!(Math.ceil(at[2]) <= -1.0))
		at[2] -= 0.05;
}
function pitchUp() {
	if (!(Math.floor(at[1]) >= 1.5))
		at[1] += 0.05;
}
function pitchDown() {
	if (!(Math.ceil(at[1]) <= -0.05))
		at[1] -= 0.05;
}
function accelerate() {
	if (acc < 0.4)
		acc += 0.001;
}
function decelerate() {
	if (acc > 0.0)
		acc -= 0.001;
}
