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

var colorBuffers = []; // This will handle our diffuse. oColor = diffuse
var vertexColorAttrib;
var vertexColorLoc;

var vertexPositionAttrib;

var ambientBuffers = [];
var specularBuffers = [];
var shininessBuffers = [];

var cameraPositionLoc;
var lightPositionLoc;
var normalAttribLoc;
var viewMatrixLoc;

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader
var laULoc; // La value
var ldULoc; // Ld value
var lsULoc; // Ls value

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

    
    mat4.rotate(modelMatrix, state.model.rotation, 0, vec3.fromValues(1.0, 0.0, 0.0));
    mat4.scale(modelMatrix, modelMatrix, state.model.scale);
    mat4.translate(modelMatrix, modelMatrix, state.model.position);
    
       
    // Update camera position, matrix, light position, etc...
    gl.uniform3fv(cameraPositionLoc, state.camera.position);
    gl.uniformMatrix4fv(mMatrixULoc, false, modelMatrix);
    gl.uniform3fv(lightPositionLoc, lightPosition);
    gl.uniform3fv(laULoc, lightAmbient);
    gl.uniform3fv(ldULoc, lightDiffuse);
    gl.uniform3fv(lsULoc, lightSpecular);

}

function setupKeyPresses(){
    document.addEventListener("keydown", (event) => {
        console.log(event.code);
        
        switch(event.code) {
        case "ArrowRight":
            vec3.add(state.model.position, state.model.position, vec3.fromValues(0.1, 0.0, 0.0));
            break;
        case "ArrowLeft":
            vec3.add(state.model.position, state.model.position, vec3.fromValues(-0.1, 0.0, 0.0));
            // TODO: Make the object move to the left
            break;
        case "ArrowUp":
            mat4.rotateZ(state.model.rotation, state.model.rotation, -0.2);
            // TODO: Rotate the object around the x-axis
            // HINT: Look at the methods for rotation here: http://glmatrix.net/docs/module-mat4.html
            // HINT: You will need to hook up rotation in the drawScene method
            break;
        case "ArrowDown":
            mat4.rotateZ(state.model.rotation, state.model.rotation, 0.2);
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
            inputTriangles[whichSet].gl_specular = [];
            inputTriangles[whichSet].gl_normals = [];
            inputTriangles[whichSet].gl_shineness = [];

            var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set

            // traverse through the vertices within our current set of triangle
            for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set

                // Grabbing vertices into our coord. list
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list

                // Grabbing ambient from the json file
                let ambientToAdd = inputTriangles[whichSet].material.ambient;
                inputTriangles[whichSet].gl_ambients.push(ambientToAdd[0], ambientToAdd[1], ambientToAdd[2]);

                // Grabbing diffuse from the json file
                let diffuseToAdd = inputTriangles[whichSet].material.diffuse;
                inputTriangles[whichSet].gl_diffuses.push(diffuseToAdd[0], diffuseToAdd[1], diffuseToAdd[2]);
                // Note: Diffuse will be our oColor

                // Grabbing specular from the json file
                let specularToAdd = inputTriangles[whichSet].material.specular;
                inputTriangles[whichSet].gl_specular.push(specularToAdd[0], specularToAdd[1], specularToAdd[2]);

                // Grabbing normals
                let normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                inputTriangles[whichSet].gl_normals.push(normalToAdd[0],normalToAdd[1],normalToAdd[2]);

                // Grabbing n-value
                inputTriangles[whichSet].gl_shineness.push(inputTriangles[whichSet].material.n, inputTriangles[whichSet].material.n, inputTriangles[whichSet].material.n);

                
            } // end for vertices in set
          
            //console.log(inputTriangles);

            // send the vertex coords and normals to webGL
            vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in

            // Send color indeces to webGL. This is our oColor value/diffuse.
            colorBuffers[whichSet] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichSet]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].gl_diffuses),gl.STATIC_DRAW);

            // Ambient buffer
            ambientBuffers[whichSet] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, ambientBuffers[whichSet]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].gl_ambients),gl.STATIC_DRAW);

            // Specular buffer

            
            // Normal buffer
            normalBuffers[whichSet] = gl.createBuffer(); 
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); 
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].gl_normals),gl.STATIC_DRAW); 

            //shininessBuffers[whichSet] = gl.createBuffer();
            //gl.bindBuffer(gl.ARRAY_BUFFER,shininessBuffers[whichSet]); 
            //gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].gl_shineness),gl.STATIC_DRAW); 
         
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

        out vec4 FragColor;

        in vec4 totalColor;

        void main(void) {

            FragColor = totalColor;
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    // have in/out for vertex colors 
    var vShaderCode = `#version 300 es
        // Variables for position
        in vec3 vertexPosition; //aPosition 

        // Variables for color
        in vec3 ambientVal;
        in vec3 oColor; //diffuse color 
        in vec3 specularVal;
        uniform vec3 la;
        uniform vec3 ld;
        uniform vec3 ls;

        in vec3 aNormal;
        in float nValue;
        uniform vec3 oLightPosition;

        vec3 oNormal;
        vec3 oFragPosition;

        uniform mat4 uProjectMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform float uLightIntensity;

        out vec4 totalColor;

        void main(void) {
            // Position needs to be a vec4 with w as 1.0
            //gl_Position = uProjectMatrix * uViewMatrix * uModelMatrix * vec4(vertexPosition, 1.0);
            gl_Position = uModelMatrix * vec4(vertexPosition, 1.0);

            // Position of the fragment in world space
            oFragPosition = (uModelMatrix * vec4(aNormal, 1.0)).xyz;
            //oNormal = (uModelMatrix * vec4(aNormal, 1.0)).xyz;
            oNormal = aNormal;
            oNormal = normalize(oNormal);

            //oFragPosition = normalize(oFragPosition); Don't worry about this
            vec3 nCameraPosition = normalize(uCameraPosition);

            // Light direction
            vec3 nLightPosition = normalize(oLightPosition);
            vec3 lightDirection = normalize(nLightPosition - oFragPosition);

            // Ambient calculations: Ka * La
            vec3 ambient = ambientVal * la; 

            // Diffuse calculations: Kd * Ld * (N dot L)
            vec3 norm = vec3(0.0, 0.0, -1.0);
            norm = normalize(norm);

            // NdotL is returning 0s for some reason. 
            //float NdotL = max(dot(oNormal, lightDirection), 0.0);
            float NdotL = max(dot(oNormal, lightDirection), 1.0);
            vec3 diffCalc = oColor * ld;
            vec3 diffuse = diffCalc * NdotL;

            // Specular calculation: Ks * Ls * (N dot H)^n
            //vec3 V = nCameraPosition - oFragPosition;
            //vec3 H = normalized(V + lightDirection); //H = normalized(V+L)

            //float NDotH = max(dot(oNormal, H), 0.0);
            //float spec = pow(max)

            // Pass along the calculated color to the Fragment shader
            vec3 result = ambient + diffuse;
            totalColor = vec4(result, 1.0);
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

                // get pointer to vertex shader input
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                
                // set up vertexColorAttrib from vertexColor
                // Note: vertexColor is our diffuse
                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "oColor");
                gl.enableVertexAttribArray(vertexColorAttrib);

                ambientULoc = gl.getAttribLocation(shaderProgram, 'ambientVal');
                gl.enableVertexAttribArray(ambientULoc);

                normalAttribLoc = gl.getAttribLocation(shaderProgram, 'aNormal');
                gl.enableVertexAttribArray(normalAttribLoc);

                //shininessULoc = gl.getAttribLocation(shaderProgram, 'nValue');
                //gl.enableVertexAttribArray(shininessULoc);

                
                mMatrixULoc =  gl.getUniformLocation(shaderProgram, 'uModelMatrix');
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
                viewMatrixLoc = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
                cameraPositionLoc = gl.getUniformLocation(shaderProgram, 'uCameraPosition');
                lightPositionLoc = gl.getUniformLocation(shaderProgram, 'oLightPosition');
                laULoc = gl.getUniformLocation(shaderProgram, "la");
                ldULoc = gl.getUniformLocation(shaderProgram, "ld");
                lsULoc = gl.getUniformLocation(shaderProgram, "ls");

                /*
                let nlightPosition = vec3.create();
                vec3.normalize(nlightPosition, lightPosition);

                let nNormal = vec3.create();
                let normal = vec3.fromValues(0.0, 0.0, -1.0);

                let oNormal = vec4.fromValues(normal, 1.0) * modelMatrix;
                vec3.normalize(nNormal, oNormal);

                let calc = vec3.create();
                let NdotL = Math.max(vec3.dot(nNormal, nlightPosition), 0.0);

                console.log(NdotL);*/

                

                
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

        //gl.bindBuffer(gl.ARRAY_BUFFER, shininessBuffers[whichTriSet]);
        //gl.vertexAttribPointer(shininessULoc,3,gl.FLOAT,false,0,0);
        
        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render


    } // end for each triangle set
} // end render triangles


