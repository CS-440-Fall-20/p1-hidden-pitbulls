var gl;
var program;
int viewingMode;
int shadingMode;

window.onload = function init() 
// Initialization
{    
    // Getting canvas from HTML
    var canvas = document.getElementById("gl-canvas");

    // Setting up WebGl
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) 
    { 
        alert("Your browser does not support WebGL."); 
    }

    // Setting up the view
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Loading shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Setting viewing and shading modes to 'Faces' and 'Phong'
    viewingMode = 2;
    shadingMode = 2;

    _LoadTerrain();
};

function _get_patch() 
{
    float xmin = -1.0;
    float xmax = 1.0;
    float zmin = -1.0;
    float zmax = 1.0;

    var vertices = [];

    var size = 0.08;
    var initialXmin = xmin;
    while (zmin <= zmax) {
        while (xmin <= xmax) {
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
}

function _LoadTerrain()
// Function to load the terrain onto the GPU
{
    var vertices = _get_patch();

    // Loading the vertices into the GPU using vertex buffer
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Associating shader program with vertex buffer
    var position = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    // Getting ambient colors based on y values
    var ambientColors = _GetAmbientColors(vertices);

    // Loading the ambient colors into the GPU using ambient color buffer
    var aColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ambientColors), gl.STATIC_DRAW);

    // Associating shader program with ambient color buffer
    var ambientColor = gl.getAttribLocation(program, "ambientColor");
    gl.vertexAttribPointer(ambientColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ambientColor);

    
    // Getting shininess values based on y values
    var shininessVals = _GetShininessVals(vertices);

    // Loading the shininess values into the GPU using shininess buffer
    var shininessBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shininessBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(shininessVals), gl.STATIC_DRAW);

    // Associating shader program with shininess buffer
    var shininess = gl.getAttribLocation(program, "shininess");
    gl.vertexAttribPointer(shininess, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shininess);

    
    // Getting Ks values based on y values
    var ksVals = _GetKsVals(vertices);

    // Loading the Ks values into the GPU using Ks buffer
    var ksBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ksBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ksVals), gl.STATIC_DRAW);

    // Associating shader program with Ks buffer
    var Ks = gl.getAttribLocation(program, "Ks");
    gl.vertexAttribPointer(Ks, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(Ks);

    _LoadShadingMode();
    _LoadPlanePos(); 
}

function _LoadShadingMode()
// Function to associate shader program with shading mode
{
    var shadeMode = gl.getAttribLocation(program, "shadingMode");
    gl.uniform3fv(shadeMode, shadingMode);
    gl.enableVertexAttribArray(shadeMode);   
}

function _LoadPlanePos()
// Function to associate shader program with shading mode
{
    var planePosition = vec3(0.0, 0.0, 1.0); // hard coded for now
    var planePos = gl.getAttribLocation(program, "planePos");
    gl.uniform3fv(planePos, planePosition);
    gl.enableVertexAttribArray(planePos);   
}

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

vec3 _AmbientColor(y)
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

float _Shininess(y)
// Function to get shininess value for a vertex based on its y value  
{
    if (y < 0.0) return 80.0; // Water
    else if (y < 0.6) return 0.0; // Beach to savannah
    else return 20.0; // Desert to snow
}

float _Ks(y)
// Function to get Ks value for a vertex based on its y value
{
    if (y < 0.0) return 1.0; // Water
    else if (y < 0.6) return 0.0; // Beach to savannah
    else return 0.4; // Desert to snow    
}

function _GetAmbientColors(vertices)
// Function to get all ambient colors for the terrain
{
    var ambientColors = [];

    for (vertex of vertices)
    {
        ambientColors.push(_AmbientColor(vertex.y));
    }

    return ambientColors;
}

function _GetShininessVals(vertices)
// Function to get all shininess values for the terrain
{
    var shininessVals = [];

    for (vertex of vertices)
    {
        shininessVals.push(_Shininess(vertex.y));
    }

    return shininessVals;    
}

function _GetKsVals(vertices)
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
    if (viewingMode = 0)
    {
        Render(gl.POINTS);
    }
    else if (viewingMode = 1)
    {
        Render(gl.LINE_LOOP);
    }
    else
    {
        Render(gl.TRIANGLES);
    }
}


function Render(mode) 
{   
    gl.drawArrays(mode, 0, 3);
}

