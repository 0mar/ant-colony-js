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

function dist(pos1, pos2) {
  let del_x = pos1[0] - pos2[0];
  let del_y = pos1[1] - pos2[1];
  return del_x * del_x + del_y * del_y;
}

class Parameters {
  constructor() {
    this.num_ants = 0;
    this.num_nodes = 5;
    this.ant_size = 12;
    this.ant_speed = 1;
    this.pheromone_decay = 0.8;
    this.pheromone_deposit = 3;
    this.time_delay = 10;
    this.dt = 0.003;
  }
}

class Scene {
  constructor() {
    this.time = 0;
    this.counter = 0;
    this.total_ants = 0;
    this.params = Parameters();
    this.nest_node = null;
    this.food_nodes = [];
    this.graph = this.new_graph();
    this.ants = [];
  }

  create_colony() {
    for (let i = 0; i < this.params.num_ants; i++) {
      ant = Ant(this);
      this.ants.push(ant);
    }
  }

  move() {
    for (let ant of this.ants) {
      ant.walk(this.params.dt);
    }
    for (let edge of this.graph.edges) {
      edge.pheromone *= Math.pow((1-this.params.pheromone_decay),self.params.dt);
    }
  }
}

class Node {
  constructor(position) {
    this.position = position;
    this.edges = [];
  }

  has_edge(edge) {
    return edges.indexOf(edge) >= 0;
  }

  connect(node) {
    if (!this.has_edge(node)) {
      this.edges.push()
    } else {
      console.log("Edge already exists!");
    }
  }

  disconnect(node) {
    let index = this.edges.indexOf(node);
    if (index >= 0) {
      this.edges.splice(index, 1);
    } else {
      console.log("Node is not connected!");
    }
  }
}

class Edge {
  constructor(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    this.weight = dist(node1.position, node2.position);
    this.pheromone = 0.1;
    this.del_x = node2[0] - node1[0];
    this.del_y = node2[1] - node1[1];
  }

  other_node(node) {
    if (this.node1 == node) {
      return this.node2;
    } else if (this.node2 == node) {
      return this.node1;
    } else {
      return null;
      console.log("Node is not connected to edge");
    }
  }

  get_position(start_node, progress) {
    let ratio = progress;
    if (this.node1 == start_node) {
      ratio = 1 - progress;
    } else if (this.node2 != start_node) {
      console.log("Start node is not connected to edge");
    }
    return [start_node.position[0] + ratio * this.del_x, start_node.position[1] + ratio * this.del_y];
  }
}
// An Ant class

class Ant {
  constructor(scene) {
    this.scene = scene;
    this.is_back_tracing = false;
    this.back_trace_list = [];
    this.from_node = scene.nest_node;
    this.edge = null;
    this.to_node = scene.nest_node;
    this.progress_on_edge = 0;
    this.has_food = True;
    this.radius = 12
    this.back_trace = True;
    this.pick_new_edge();
  }

  display() {
    let color = 150;
    if (this.has_food) {
      color = 10;
    }
    stroke(200);
    strokeWeight(2);
    fill(color);
    let position = this.position();
    ellipse(position[0], position[1], this.radius, this.radius);
  }

  walk(dt) {
    let progress = dt * this.scene.params.speed;
    this.progress_on_edge += progress / this.edge.weight;
    this.position = this.position();
    if (this.has_food) {
      this.deposit_pheromone();
    }
    if (this.progress >= 1) {
      if (this.at_food() && !this.has_food) {
        this.has_food = True;
        this.is_back_tracing = True;
        this.back_trace_list.append(this.from_node);
      } else if (this.at_nest && this.has_food) {
        this.has_food = False;
        this.is_back_tracing = False;
        this.back_trace_list = [this.scene.nest_node];
      }
      this.pick_new_edge();
    }
  }

  position() {
    return this.edge.get_position(this.from_node, this.progress_on_edge);
  }

  deposit_pheromone() {
    let addition = this.scene.params.pheromone_deposit * this.scene.params.dt / this.edge.weight;
    this.edge.weight += addition;
  }

  pick_new_edge() {
    let prev_node = this.from_node;
    if (this.back_trace && !this.is_back_tracing) {
      this.back_trace_list.push(prev_node);
    }
    this.from_node = this.to_node;
    if (this.has_food && this.back_trace && this.is_back_tracing) {
      this.to_node = this.back_trace_list[this.back_trace_list.length - 1];
      let first_occurence = this.back_trace_list.indexOf(this.to_node);
      this.back_trace_list = this.back_trace_list.slice(0, first_occurence);
    } else {
      let edges = this.from_node.edges.copy();
      if (edges.length > 1 && !(this.at_food() || this.at_nest())) {
        for (let i = 0; i < this.from_node.edges.length; i++) {
          if (edges[i].other_node(this.from_node) == prev_node) {
            edges.splice(i, 1); // Todo: Move removal to zero pheromone below.
          }
        }
      }
      let arbitraryness = 0.0; // Todo: Move to scene // Todo: Check what happens if positive
      let total_pheromone = edges.reduce((a, b) => a.pheromone + b.pheromone, 0) + arbitraryness;
      let it = -1;
      let pher_indicator = random(0, total_pheromone);
      do {
        pher_indicator -= edges.pheromone;
        it++; process_on_edge
      } while (pher_indicator > 0);
      this.to_node = edges[it].other(prev_node);
    }
    this.edge = edges[it];
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
