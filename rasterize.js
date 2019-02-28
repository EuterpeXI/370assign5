/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
/* assignment specific globals */
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog4/triangles.json"; // triangles file loc
var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector
var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission
var lightPosition = vec3.fromValues(-1,3,-0.5); // default light position
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press

/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = 0; // how much to displace view with each key press

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

// ASSIGNMENT HELPER FUNCTIONS

// set up the webGL environment
function setupWebGL() {

    // Set up keys
    // document.onkeydown = handleKeyDown; // call this when key pressed
    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl2"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles set by set , load them into webgl buffers (one buffer per set)
function loadModels(inputTriangles) {
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
         
        var vtxToAdd; // vtx coords to add to the coord array
        var triToAdd; // tri indices to add to the index array
        
        // process each triangle set to load webgl vertex and triangle buffers
        numTriangleSets = inputTriangles.length; // remember how many tri sets
        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set

            // set up the vertex and normal arrays, define model center and axes
            inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
            var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
            for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list
            } // end for vertices in set
          
            // send the vertex coords and normals to webGL
            vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in
         
            // set up the triangle index array, adjusting indices across sets
            inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
            triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
            for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
            } // end for triangles in set

            // send the triangle indices to webGL
            triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].glTriangles),gl.STATIC_DRAW); // data in

        } // end for each triangle set 

    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    // here you need to take care of color attibutes
    var fShaderCode = `
        void main(void) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    // have in/out for vertex colors 
    var vShaderCode = `
        attribute vec3 vertexPosition;

        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                // set up vertexColorAttrib from vertexColor
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderModels() {
    
    //window.requestAnimationFrame(renderModels); // set up frame render callback
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
  
    var currSet; // the tri set and its material properties
    for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
        currSet = inputTriangles[whichTriSet];
        
        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
   
        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
        
    } // end for each triangle set
} // end render triangles


function doDrawing(inputTriangles) {
    setupWebGL(); // set up the webGL environment
    loadModels(inputTriangles); // load in the triangles from tri file
    setupShaders(); // setup the webGL shaders
    renderModels(); // draw the triangles using webGL
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
        // Hook up the button
        const fileUploadButton = document.querySelector("#fileUploadButton");
        fileUploadButton.addEventListener("click", () => {
            console.log("Submitting file...");
            let fileInput  = document.getElementById('inputFile');
            let files = fileInput.files;
            let url = URL.createObjectURL(files[0]);
    
            fetch(url, {
                mode: 'no-cors' // 'cors' by default
            }).then(res=>{
                return res.text();
            }).then(data => {
                var inputTriangles = JSON.parse(data);
    
                doDrawing(inputTriangles);

            }).catch((e) => {
                console.error(e);
            });
    
        });
  
} // end main
