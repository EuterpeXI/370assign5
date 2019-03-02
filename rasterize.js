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

var colorBuffers = [];
var vertexColorAttrib;
var vertexColorLoc;

var vertexPositionAttrib;

var ambientBuffers = [];
var shininessBuffers = [];

var cameraPositionLoc;
var lightPositionLoc;

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader

var normalAttribLoc;
var viewMatrixLoc;

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

var state = {
    camera: {
        position: Eye,
        center: Center,
        up: Up,
    },
    model: {
        position: vec3.fromValues(0.0, 0.0, 0.0),
        rotation: mat4.create(), 
        scale: vec3.fromValues(1.0, 1.0, 1.0),  
    },
    canvas: null,
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



function doDrawing(inputTriangles) {
    setupWebGL(); // set up the webGL environment
    loadModels(inputTriangles); // load in the triangles from tri file
    setupShaders(); // setup the webGL shaders
    setupKeyPresses();
    
    var then = 0.0;

    //Update function
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        drawScene();
        renderModels(); // draw the triangles using webGL
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

}

function drawScene(){
    var projectionMatrix = mat4.create();
    var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
    var aspect = state.canvas.clientWidth / state.canvas.clientHeight;
    var near = 4.0;
    var far = 100.0;


    mat4.perspective(projectionMatrix, fovy, aspect, near, far);
    gl.uniformMatrix4fv(pvmMatrixULoc, false, projectionMatrix);

    var viewMatrix = mat4.create();
        mat4.lookAt(
            viewMatrix,
            state.camera.position,
            state.camera.center,
            state.camera.up,
        );

    gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix);

    var modelMatrix = mat4.create();
    gl.uniformMatrix4fv(mMatrixULoc, false, modelMatrix);
    mat4.rotate(modelMatrix, state.model.rotation, 0, vec3.fromValues(1.0, 0.0, 0.0));
    mat4.scale(modelMatrix, modelMatrix, state.model.scale);
    mat4.translate(modelMatrix, modelMatrix, state.model.position);
    
       
    // Update camera position
    gl.uniform3fv(cameraPositionLoc, state.camera.position);

    gl.uniform3fv(lightPositionLoc, lightPosition);

}

function setupKeyPresses(){
    document.addEventListener("keydown", (event) => {
        console.log(event.code);
        
        switch(event.code) {
        case "ArrowRight":
            vec3.add(state.model.position, state.model.position, vec3.fromValues(1.1, 0.0, 0.0));
            break;
        case "ArrowLeft":
            vec3.add(state.model.position, state.model.position, vec3.fromValues(-1.1, 0.0, 0.0));
            // TODO: Make the object move to the left
            break;
        case "ArrowUp":
            mat4.rotateX(state.model.rotation, state.model.rotation, -0.2);
            // TODO: Rotate the object around the x-axis
            // HINT: Look at the methods for rotation here: http://glmatrix.net/docs/module-mat4.html
            // HINT: You will need to hook up rotation in the drawScene method
            break;
        case "ArrowDown":
            mat4.rotateX(state.model.rotation, state.model.rotation, 0.2);
            // TODO: Rotate the object around the x-axis in the other direction
            break;
        case "Minus":
            mat4.multiplyScalar(state.model.scale, state.model.scale, 1.5);
            // TODO: Make the object larger by changing the scale
            break;
        case "Equal":
            // Reset the state
            state.model.position = vec3.fromValues(0.0, 0.0, 0.0);
            state.model.rotation = mat4.create(); // Identity matrix
            state.model.scale = vec3.fromValues(1.0, 1.0, 1.0);
            break;
        default:
            break;
        }
    });
}


// ASSIGNMENT HELPER FUNCTIONS

// set up the webGL environment
function setupWebGL() {

    // Set up keys
    // document.onkeydown = handleKeyDown; // call this when key pressed
    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl2"); // get a webgl object from it
    state.canvas = canvas;
    
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

        var whichSetColor;
         
        var vtxToAdd; // vtx coords to add to the coord array
        var triToAdd; // tri indices to add to the index array

        
        // process each triangle set to load webgl vertex and triangle buffers
        numTriangleSets = inputTriangles.length; // remember how many tri sets
        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set
            //console.log(inputTriangles[whichSet].material.diffuse);

            // set up the vertex and normal arrays, define model center and axes
            inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
            inputTriangles[whichSet].gl_diffuses = [];
            inputTriangles[whichSet].gl_ambients = [];
            inputTriangles[whichSet].gl_normals = [];
            inputTriangles[whichSet].gl_shineness = [];

            var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
            for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list


                let diffuseToAdd =  inputTriangles[whichSet].material.diffuse;
                let ambientToAdd = inputTriangles[whichSet].material.ambient;
                inputTriangles[whichSet].gl_diffuses.push(diffuseToAdd[0],diffuseToAdd[1], diffuseToAdd[2]);
                inputTriangles[whichSet].gl_ambients.push(ambientToAdd[0], ambientToAdd[1], ambientToAdd[2]);

                let normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                inputTriangles[whichSet].gl_normals.push(normalToAdd[0],normalToAdd[1],normalToAdd[2]);

                inputTriangles[whichSet].gl_shineness.push(inputTriangles[whichSet].material.n, inputTriangles[whichSet].material.n, inputTriangles[whichSet].material.n);

                
            } // end for vertices in set
          
            //console.log(inputTriangles);
            // send the vertex coords and normals to webGL
            vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in

            ambientBuffers[whichSet] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, ambientBuffers[whichSet]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].gl_ambients),gl.STATIC_DRAW);

            colorBuffers[whichSet] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichSet]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].gl_diffuses),gl.STATIC_DRAW);

            normalBuffers[whichSet] = gl.createBuffer(); 
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); 
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].gl_normals),gl.STATIC_DRAW); 

            shininessBuffers[whichSet] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,shininessBuffers[whichSet]); 
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].gl_shineness),gl.STATIC_DRAW); 
         
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

        console.log(inputTriangles);


    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    // here you need to take care of color attibutes
    var fShaderCode = `#version 300 es
        precision highp float;

        in vec3 oNormal;
        in vec3 oFragPosition;
        in vec3 oCameraPosition;
        in vec3 lightPosition;
        in vec3 ambientOut;
        in vec4 diffuseOut;
        in vec3 specularOut;
        in float outNValue;
        
        vec3 lightColor = vec3(1.0, 1.0, 1.0);

        out vec4 FragColor;

        void main(void) {

            vec3 lightDirection;
            lightDirection = normalize(lightPosition - oFragPosition);
            float diffMagnitude = max(dot(oNormal, lightDirection), 0.0);
            vec3 diffuse = diffMagnitude * lightColor;

            //specular ks * ls (N.H)^n
            //H = normalized(V+L)

            vec3 nCameraPosition = normalize(oCameraPosition);
            vec3 H = normalize(nCameraPosition + lightDirection);
            float NDotH = max(dot(oNormal, H), 0.0);

            float temp = pow(NDotH, outNValue);
            vec3 specularVal = (specularOut * lightColor) * temp;


            vec3 result = (diffuse + ambientOut + specularVal) * diffuseOut.rgb;
            FragColor = vec4(result, 1.0);
            //FragColor = oColor;
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    // have in/out for vertex colors 
    var vShaderCode = `#version 300 es
        in vec3 vertexColor; //diffuse color here
        in vec3 vertexPosition; //aPosition we think??!?!
        in vec3 aNormal;
        in vec3 ambientLight;
        in vec3 specularLight;
        in float nValue;
        in vec3 oLightPosition;

        out vec4 oColor;
        out vec3 oNormal;
        out vec3 oFragPosition;
        out vec3 oCameraPosition;
        out vec3 lightPosition;
        out vec3 ambientOut;
        out vec4 diffuseOut;
        out vec3 specularOut;
        out float outNValue;

        uniform mat4 uProjectMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform float uLightIntensity;

        void main(void) {
            lightPosition = oLightPosition;

            oFragPosition = (uModelMatrix * vec4(aNormal, 1.0)).xyz;

            gl_Position = uModelMatrix * vec4(vertexPosition, 1.0);


            ambientOut = ambientLight;
            diffuseOut = vec4(vertexColor, 1.0);
            specularOut = specularLight;

            oNormal = (uModelMatrix * vec4(aNormal, 1.0)).xyz;

            oNormal = normalize(oNormal);
            outNValue = nValue;

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
                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);

                ambientULoc = gl.getAttribLocation(shaderProgram, 'ambientLight');
                gl.enableVertexAttribArray(ambientULoc);

                normalAttribLoc = gl.getAttribLocation(shaderProgram, 'aNormal');
                gl.enableVertexAttribArray(normalAttribLoc);

                shininessULoc = gl.getAttribLocation(shaderProgram, 'nValue');
                gl.enableVertexAttribArray(shininessULoc);

                
                mMatrixULoc =  gl.getUniformLocation(shaderProgram, 'uModelMatrix');
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
                viewMatrixLoc = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
                cameraPositionLoc = gl.getUniformLocation(shaderProgram, 'uCameraPosition');
                lightPositionLoc = gl.getUniformLocation(shaderProgram, 'oLightPosition');
            

                

                
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
        //gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
        gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

        gl.bindBuffer(gl.ARRAY_BUFFER, ambientBuffers[whichTriSet]);
        gl.vertexAttribPointer(ambientULoc,3,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichTriSet]);
        gl.vertexAttribPointer(vertexColorAttrib,3,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[whichTriSet]);
        gl.vertexAttribPointer(normalAttribLoc,3,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER, shininessBuffers[whichTriSet]);
        gl.vertexAttribPointer(shininessULoc,3,gl.FLOAT,false,0,0);
        
        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render


    } // end for each triangle set
} // end render triangles


