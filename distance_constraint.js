// Distance constraint example, inspired by https://zalo.github.io/blog/constraints/

const gravity = new Vector(0, 5);

const DistanceConstraint = Object.freeze({
  MIN_DISTANCE: 0,
  MAX_DISTANCE: 1,
  FIXED_DISTANCE: 2,
});

function constrainDistance(point, anchor, distance, distance_constraint) {
  const diff = anchor.subtract(point);
  const distance_to_anchor = diff.getMagnitude();
  if ( distance_constraint === DistanceConstraint.FIXED_DISTANCE ||
      (distance_constraint === DistanceConstraint.MIN_DISTANCE && distance_to_anchor < distance) ||
      (distance_constraint === DistanceConstraint.MAX_DISTANCE && distance_to_anchor > distance)) {
    return point.add(diff.getWithMagnitude(distance_to_anchor - distance));
  }
  else { return point; }
}

class MouseCircle {
  constructor(radius) {
    this.radius = radius;
    this.position = new Vector(0, 0);
  }

  update(mouse_state) {
    this.position = mouse_state.position;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle = "#222";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.closePath();
  }
}

class ConstrainedPoint{
  static points = [];
  constructor(parent, distance, distance_constraint, radius) {
    this.parent = parent;
    this.distance = distance;
    this.radius = radius;
    this.distance_constraint = distance_constraint;
    this.position = getRandomPosition();
    ConstrainedPoint.points.push(this);
  }

  update(mouse_state) {
    this.position = constrainDistance(this.position, this.parent.position, this.distance, this.distance_constraint);

    for (let object of ConstrainedPoint.points) {
      if (object === this) { continue; }
      const distance = this.position.getDistance(object.position);
      if (distance < object.radius + this.radius) {
        const constrain_distance = (object.radius + this.radius + distance) / 2;
        const new_position = constrainDistance(this.position, object.position, constrain_distance, DistanceConstraint.MIN_DISTANCE);
        object.position = constrainDistance(object.position, this.position, constrain_distance, DistanceConstraint.MIN_DISTANCE);
        this.position = new_position;
      }
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle = "#310091";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.closePath();
  }
}

class DistanceConstraintChain {
  constructor(n, link_length) {
    this.link_length = link_length;
    this.points = new Array(n).fill(null).map(() => new Vector(0, 0));
  }

  update(mouse_state) {
    this.points[0] = mouse_state.position;
    for (let i = 1; i < this.points.length; i++) {
      const previous = this.points[i - 1];
      this.points[i] = this.points[i].add(gravity);
      this.points[i] = constrainDistance(this.points[i], previous, this.link_length, DistanceConstraint.FIXED_DISTANCE);
    }
  }

  draw() {
    this.points.forEach((point, i, points) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.link_length, 0, Math.PI*2);
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
      ctx.closePath();

      if (i > 0) {
        const previous = points[i - 1];
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        ctx.closePath();
      }
    });
  }
}

class FABRIKChain {
  constructor(n, link_length) {
    this.link_length = link_length;
    this.points = new Array(n).fill(null).map(() => new Vector(0, 0));
  }

  update(mouse_state) {
    this.points[0] = mouse_state.position;
    for (let i = 1; i < this.points.length; i++) {
      const previous = this.points[i - 1];
      this.points[i] = this.points[i].add(gravity);
      this.points[i] = constrainDistance(this.points[i], previous, this.link_length, DistanceConstraint.FIXED_DISTANCE);
    }

    this.points[this.points.length - 1] = canvas_center.copy();
    for (let i = this.points.length - 1; i > 0; i--) {
      const current = this.points[i];
      this.points[i] = this.points[i].add(gravity);
      this.points[i - 1] = constrainDistance(this.points[i - 1], current, this.link_length, DistanceConstraint.FIXED_DISTANCE);
    }
  }

  draw() {
    this.points.forEach((point, i, points) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.link_length, 0, Math.PI*2);
      ctx.strokeStyle = "#000";
      ctx.stroke();
      ctx.closePath();

      if (i > 0) {
        const previous = points[i - 1];
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = "#FFF";
        ctx.stroke();
        ctx.closePath();
      }
    });
  }
}

let drawables = [];
drawables.push(new MouseCircle(100))
drawables.push(new ConstrainedPoint(drawables[0], 100, DistanceConstraint.MAX_DISTANCE, 10));
for (let i = 0; i < 100; i++) {
  drawables.push(new ConstrainedPoint(drawables[0], 100, DistanceConstraint.MIN_DISTANCE, 10));
}
drawables.push(new DistanceConstraintChain(100, 5));
drawables.push(new FABRIKChain(50, 5));

function mainLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let object of drawables) {
    object.update(mouse_state, drawables);
    object.draw();
  }
}
setInterval(mainLoop, (1000 / 60));
