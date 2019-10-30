let antennae;

function setup() {
  createCanvas(1600, 1000);
  system = new ParticleSystem(createVector(width / 2, 50));
}

function draw() {
  background(51);
  system.addParticle();
  system.run();
}

// An Ant class

class Ant {
  constructor(scene) {
    this.scene = scene;
    this.is_back_tracing = false;
    this.back_trace_list = [];
    this.from_node = scene.nest_node;
    this.edge = null;
    this.to_node = null;
    this.process_on_edge = 0;
    this.has_food = True;
    this.radius = 12
    this.back_trace = True;
  }

  display() {
    var color = 150;
    if (this.has_food) {
      color = 10;
    }
    stroke(200);
    strokeWeight(2);
    fill(color);
    var position = this.position();
    ellipse(position[0], position[1], this.radius, this.radius);
  }

  walk() {
  }

  position() {
    pos_x = 0;
    pos_y = 0;
    return [pos_x, pos_y];
  }

  deposit_pheromone() {
    var addition = this.scene.params.pheromone_deposit * this.scene.params.dt / this.edge.weight;
    this.edge.weight += addition;
  }

  pick_new_edge() {
    prev_node = this.from_node;
    if (this.back_trace && !this.is_back_tracing) {
      this.back_trace_list.push(prev_node);
    }
    this.from_node = this.to_node;
    if (this.has_food && this.back_trace && this.is_back_tracing) {
      this.to_node = this.back_trace_list[this.back_trace_list.length - 1];
      first_occurence = this.back_trace_list.indexOf(this.to_node);
      this.back_trace_list = this.back_trace_list.splice(0, first_occurence);
    } else {
      var edges = this.from_node.edges().copy();
      if (edges.length > 1 && !(this.at_food() || this.at_nest())) {
        for (var i = 0; i < this.from_node.edges().length; i++) {
          if (edges[i].other_node(this.from_node) == prev_node) {
            edges.remove[i]//fixme
          }
        }
      }
      var arbitraryness = 0.0; // Todo: Move to scene // Todo: Check what happens if positive
      var total_pheromone = edges.reduce((a, b) => a.pheromone + b.pheromone, 0) + arbitraryness;
      var it = -1;
      var pher_indicator = random(0, total_pheromone);
      do {
        pher_indicator -= edges.pheromone;
        it++;
      } while (pher_indicator > 0);
      this.to_node = edges[it].other(prev_node);
    }
    this.edge=edges[it];
  }

  at_nest() {
    // Assuming a node is reached
    return this.to_node == this.scene.nest_node;
  }

  at_food() {
    // Assuming a node is reached
    return this.scene.food_nodes.indexOf(this.to_node) >= 0;
  }
}



// Todo: Opaque the paths with the pheromone
// A simple Particle class
class Particle {
  constructor(position) {
    this.acceleration = createVector(0, 0.05);
    this.velocity = createVector(random(-1, 1), random(-1, 0));
    this.position = position.copy();
    this.lifespan = 255;
  }
  run() {
    this.update();
    this.display();
  }
  // Method to update position
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifespan -= 2;
  }
  // Method to display
  display() {
    stroke(200, this.lifespan);
    strokeWeight(2);
    fill(127, this.lifespan);
    ellipse(this.position.x, this.position.y, 12, 12);
  }
  // Is the particle still useful?
  isDead() {
    return this.lifespan < 0;
  }
}





let ParticleSystem = function (position) {
  this.origin = position.copy();
  this.particles = [];
};

ParticleSystem.prototype.addParticle = function () {
  this.particles.push(new Particle(this.origin));
};

ParticleSystem.prototype.run = function () {
  for (let i = this.particles.length - 1; i >= 0; i--) {
    let p = this.particles[i];
    p.run();
    if (p.isDead()) {
      this.particles.splice(i, 1);
    }
  }
};
