var gl;
var program;
var viewingMode;
var shadingMode;
var vertices;

var near = 0.5;
var far = 250.0;
var radius = 6.0;
var theta = 55.0;
var phi = 50;
var fov = 50;
var acc = 0.05;
var aspect;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

window.onload = function init() 
// Initialization
{    
    // Getting canvas from HTML
    var canvas = document.getElementById("gl-canvas");
    aspect = canvas.width / canvas.height;

    // Setting up WebGl
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) 
    { 
        alert("Your browser does not support WebGL."); 
    }

    // Setting up the view
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.4, 0.8, 1.0); // Sky color
    gl.enable(gl.DEPTH_TEST);

    // Loading shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Setting viewing and shading modes to 'Faces' and 'Phong'
    viewingMode = 2;
    shadingMode = 2;

    _LoadTerrain();
    _FrameRender();
};

function _LoadTerrain()
// Function to generate and load the terrain onto the GPU
{
    get_patch(-10, 10, -10, 10); // -10 to 10 on both x and z axis 

    // Loading the vertices into the GPU using vertex buffer
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Associating shader program with vertex buffer
    var position = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    // Getting ambient colors based on y values
    var ambientColors = _GetAmbientColors();

    // Loading the ambient colors into the GPU using ambient color buffer
    var aColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ambientColors), gl.STATIC_DRAW);

    // Associating shader program with ambient color buffer
    var ambientColor = gl.getAttribLocation(program, "ambientColor");
    gl.vertexAttribPointer(ambientColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ambientColor);

    
    // Getting shininess values based on y values
    var shininessVals = _GetShininessVals();

    // Loading the shininess values into the GPU using shininess buffer
    var shininessBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shininessBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(shininessVals), gl.STATIC_DRAW);

    // Associating shader program with shininess buffer
    var shininess = gl.getAttribLocation(program, "shininess");
    gl.vertexAttribPointer(shininess, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shininess);

    
    // Getting Ks values based on y values
    var ksVals = _GetKsVals();

    // Loading the Ks values into the GPU using Ks buffer
    var ksBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ksBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ksVals), gl.STATIC_DRAW);

    // Associating shader program with Ks buffer
    var Ks = gl.getAttribLocation(program, "Ks");
    gl.vertexAttribPointer(Ks, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(Ks);


    // Associating shader program with perspective view from a certain height
    eye = vec3(radius * Math.sin(theta) * Math.cos(phi), 
        radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at, up);
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelview");
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    
    projectionMatrix = perspective(fov, aspect, near, far);
    projectionMatrixLoc = gl.getUniformLocation(program, "projection");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    _LoadShadingMode();
    // _LoadPlanePos(); 
}

function get_patch(xmin, xmax, zmin, zmax) 
// Function to generate terrain
{
    var size = 0.05;
    var initialXmin = xmin;
    noise.seed(9);
    
    while (zmin <= zmax) 
    {
        while (xmin <= xmax) 
        {
            vertices.push(vec3(xmin, 0, zmin));
            vertices.push(vec3(xmin, 0, zmin + size));
            vertices.push(vec3(xmin, 0, zmin + size));
            vertices.push(vec3(xmin + size, 0, zmin));
            vertices.push(vec3(xmin + size, 0, zmin));
            vertices.push(vec3(xmin, 0, zmin));
            xmin += size;
        }
        
        xmin = initialXmin;
        zmin += size;
    }
    
    for (var i = 2; i < vertices.length - 2; i++) 
    {
        vertices[i - 2][1] = noise.perlin2(vertices[i - 2][0], vertices[i - 2][2]);
    }
}

function _LoadShadingMode()
// Function to associate shader program with shading mode
{
    var shadeMode = gl.getAttribLocation(program, "shadingMode");
    gl.uniform3fv(shadeMode, shadingMode);
    gl.enableVertexAttribArray(shadeMode);   
}

// function _LoadPlanePos()
// // Function to associate shader program with plane's position
// {
//     var planePosition = vec3(0.0, 0.0, 1.0); // hard coded for now
//     var planePos = gl.getAttribLocation(program, "planePos");
//     gl.uniform3fv(planePos, planePosition);
//     gl.enableVertexAttribArray(planePos);   
// }

function KeyPressEvent(event)
// Function that reacts to keys V and C,
// used to toggle viewing and shading modes
{
    if (event.code == 'KeyV')
    {
        viewingMode = (viewingMode + 1) % 3; 
    }

    if (event.code == 'KeyC')
    {
        shadingMode = (shadingMode + 1) % 3;
        _LoadShadingMode();
        _FrameRender();
    }
}

function _AmbientColor(y)
// Function to get ambient color for a vertex based on its y value 
{
    if (y < 0.0) return vec3(0.0, 0.8, 1.0); // Water
    else if (y < 0.1) return vec3(1.0, 0.8, 0.6); // Beach
    else if (y < 0.2) return vec3(0.0, 0.8, 0.4); // Forest
    else if (y < 0.4) return vec3(0.0, 0.6, 0.0); // Jungle
    else if (y < 0.6) return vec3(0.6, 0.8, 0.0); // Savannah
    else if (y < 0.8) return vec3(0.8, 0.6, 0.0); // Desert
    else return (1.0, 1.0, 1,0); // Snow
}

function _Shininess(y)
// Function to get shininess value for a vertex based on its y value  
{
    if (y < 0.0) return 80.0; // Water
    else if (y < 0.6) return 0.0; // Beach to savannah
    else return 20.0; // Desert to snow
}

function _Ks(y)
// Function to get Ks value for a vertex based on its y value
{
    if (y < 0.0) return 1.0; // Water
    else if (y < 0.6) return 0.0; // Beach to savannah
    else return 0.4; // Desert to snow    
}

function _GetAmbientColors()
// Function to get all ambient colors for the terrain
{
    var ambientColors = [];

    for (vertex of vertices)
    {
        ambientColors.push(_AmbientColor(vertex.y));
    }

    return ambientColors;
}

function _GetShininessVals()
// Function to get all shininess values for the terrain
{
    var shininessVals = [];

    for (vertex of vertices)
    {
        shininessVals.push(_Shininess(vertex.y));
    }

    return shininessVals;    
}

function _GetKsVals()
// Function to get all Ks values for the terrain
{
    var ksVals = [];

    for (vertex of vertices)
    {
        ksVals.push(_Ks(vertex.y));
    }

    return ksVals;    
}

function _FrameRender()
// Function to render a single frame
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (viewingMode == 0)
    {
        _Render(gl.POINTS);
    }
    else if (viewingMode == 1)
    {
        _Render(gl.LINES);
    }
    else
    {
        _Render(gl.TRIANGLES);
    }
}


function _Render(mode) 
{   
    gl.drawArrays(mode, 0, vertices.length);
}

