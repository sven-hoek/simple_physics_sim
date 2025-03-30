var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
/*
var rightPressed = false;
var leftPressed = false;
var upPressed = false;
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);
function keyDownHandler(e) {
    if(e.key == "Right" || e.key == "ArrowRight" || e.key == "d") {
        rightPressed = true;
    }
    else if(e.key == "Left" || e.key == "ArrowLeft" || e.key == "a") {
        leftPressed = true;
    }
    else if(e.key == "Up" || e.key == "ArrowUp" || e.key == "w") {
        upPressed = true;
    }
}
function keyUpHandler(e) {
    if(e.key == "Right" || e.key == "ArrowRight" || e.key == "d") {
        rightPressed = false;
    }
    else if(e.key == "Left" || e.key == "ArrowLeft" || e.key == "a") {
        leftPressed = false;
    }
    else if(e.key == "Up" || e.key == "ArrowUp" || e.key == "w") {
        upPressed = false;
    }
}
function mouseMoveHandler(e) {
  mouse_x = e.clientX
}
*/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Class representing a 2D Vector
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(v) { return new Vector(this.x + v.x, this.y + v.y); }

  subtract(v) { return new Vector(this.x - v.x, this.y - v.y); }

  mult(s) { return new Vector(this.x * s, this.y * s); }

  rotate(a) {
    const cos_a = Math.cos(a);
    const sin_a = Math.sin(a);
    const x = cos_a * this.x - sin_a * this.y;
    const y = sin_a * this.x + cos_a * this.y;
    return new Vector(x, y);
  }

  getSquaredMagnitude() { return this.x * this.x + this.y * this.y; }

  getMagnitude() { return Math.sqrt(this.getSquaredMagnitude()); }

  getWithMagnitude(m) { return this.getMagnitude() > 0 ? this.mult(m / this.getMagnitude()) : new Vector(0, 0); }

  getDistance(v) { return this.subtract(v).getMagnitude(); }

  toString() { return `(${this.x}, ${this.y})`; }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Class representing a point of an elastic blob
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class BlobPoint {
  constructor(position, speed, radius, dampening_factor, lifetime) {
    this.position = new Vector(position.x, position.y);
    this.previous_position = position.subtract(speed);
    this.displacement = new Vector(0, 0);
    this.displacement_weight = 0;
    this.radius =  radius
    this.dampening_factor = dampening_factor;
    this.lifetime = lifetime;
    drawables.push(this)

    console.log("Creating BlobPoint", this)
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
  }

  getVelocity() { return this.position.subtract(this.previous_position); }

  restrictPositionToCanvas() { this.position = clampVectorToCanvas(this.position); }

  integrateKinematics() {
    const velocity = this.getVelocity().add(gravity);
    const dampened_velocity = velocity.mult(this.dampening_factor);
    const new_position = this.position.add(dampened_velocity);

    this.previous_position = this.position
    this.position = new_position;
  }

  updateLifetime() {
    if (this.lifetime > 0) {
      this.lifetime--;
    }
  }

  accumulateDisplacement(v) {
    this.displacement = this.displacement.add(v);
    this.displacement_weight += 1;
  }

  applyDisplacement() {
    if (this.displacement_weight > 0) {
      this.position = this.position.add(this.displacement.mult(1 / this.displacement_weight));
      this.displacement = new Vector(0, 0);
      this.displacement_weight = 0;
    }
  }

  update() {
    this.applyDisplacement();
    this.restrictPositionToCanvas();
    this.integrateKinematics();
    this.updateLifetime();
  }
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Class representing an elastic blob
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Blob {
  constructor(origin, n_points, radius, puffiness, iterations) {
    this.radius = radius;
    this.area = radius * radius * Math.PI * puffiness;
    this.circumference = radius * Math.PI * 2;
    this.chord_length = this.circumference / n_points;
    this.iterations = iterations;
    this.points = new Array(n_points).fill(null).map((value, i) => {
      const angle = 2 * Math.PI * i / n_points - Math.PI / 2;
      const offset = new Vector(Math.cos(angle) * radius, Math.sin(angle) * radius);
      return new BlobPoint(origin.add(offset), new Vector(5, 0), 3, 0.99, 600);
    });
    this.lifetime = -1;
    drawables.push(this);
  }

  update() {
    for (let i = 0; i < this.iterations; ++i) {
      this.points.forEach((cur, i, points) => {
        let next  = points[i == points.length - 1 ? 0 : i + 1];

        const diff = next.position.subtract(cur.position);
        if (diff.getMagnitude() != this.chord_length) {
          const error = (diff.getMagnitude() - this.chord_length) / 2;
          const offset = diff.getWithMagnitude(error);
          cur.accumulateDisplacement(offset);
          next.accumulateDisplacement(offset.mult(-1));
        }
      });
    }

    const area_error = this.area - this.getArea();
    const offset = area_error / this.circumference;

    this.points.forEach((cur, i, points) => {
      let prev = points[i == 0 ? points.length - 1 : i - 1];
      let next  = points[i == points.length - 1 ? 0 : i + 1];
      const secant = next.position.subtract(prev.position);
      const normal = secant.rotate(-Math.PI / 2).getWithMagnitude(offset);
      cur.accumulateDisplacement(normal);
    })
  }

  draw() {}

  getArea() {
    return this.points.reduce((area, cur, i, points) => {
      let next  = points[i == points.length - 1 ? 0 : i + 1];
      return area + (cur.position.x - next.position.x) * ((cur.position.y + next.position.y) / 2);
    }, 0)
  }

  toString() {
    this.points.map((value) => value.position).join(", ")
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isXWithinCanvas(x) { return x >= 0 && x <= canvas.width; }
function isYWithinCanvas(y) { return y >= 0 && y <= canvas.height; }
function isVectorWithinCanvas(v) { return isXWithinCanvas(v.x) && isYWithinCanvas(v.y); }

function clamp(x, min, max) { return Math.max(min, Math.min(x, max)); }

function clampVectorToRect(v, upper_left, bottom_right) {
  return new Vector(
    clamp(v.x, upper_left.x, bottom_right.x),
    clamp(v.y, upper_left.y, bottom_right.y),
  );
}

function clampVectorToCanvas(v) { return clampVectorToRect(v, canvas_ul, canvas_br); }


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLOBAL CONSTANTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const canvas_center = new Vector(canvas.width / 2, canvas.height / 2);
const canvas_ul = new Vector(0, 0);
const canvas_br = new Vector(canvas.width, canvas.height);

const gravity = new Vector(0, 0.2);
var drawables = new Array();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CREATION OF OBJECTS AND UPDATE LOOP
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// let blob_point = new BlobPoint(canvas_center, new Vector(5, 0), 10, 0.99, -1);
let blob = new Blob(canvas_center, 50, 70, 2, 10);

function mainLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let object of drawables) {
    object.draw();
    object.update();
  }
  drawables = drawables.filter(function(value, index, arr) {return value.lifetime != 0;});
}
setInterval(mainLoop, (1000 / 60));
