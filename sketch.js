let scene;

function setup() {
  createCanvas(800, 800);
  scene = new Scene();
}

function draw() {
  background(51);
  scene.time += scene.params.dt;
  scene.move();
  scene.display();
}

function distance(pos1, pos2) {
  let del_x = pos1[0] - pos2[0];
  let del_y = pos1[1] - pos2[1];
  return Math.sqrt(del_x * del_x + del_y * del_y);
}

class Parameters {
  constructor() {
    this.num_ants = 1;
    this.num_nodes = 5;
    this.ant_size = 12;
    this.ant_speed = 10;
    this.pheromone_decay = 0.005;
    this.pheromone_deposit = 100;
    this.time_delay = 10;
    this.dt = 0.2;
    this.arbitraryness = 0.0;
  }
}

class Scene {
  constructor() {
    this.time = 0;
    this.counter = 0;
    this.params = new Parameters();
    this.nest_node = null;
    this.food_nodes = [];
    this.graph = this.test_graph();
    this.ants = [];
    this.create_colony();
  }

  create_colony() {
    for (let i = 0; i < this.params.num_ants; i++) {
      let ant = new Ant(this);
      this.ants.push(ant);
    }
  }

  move() {
    for (let ant of this.ants) {
      ant.walk(this.params.dt);
    }
    for (let edge of this.graph.edges) {
      edge.pheromone *= Math.pow((1 - this.params.pheromone_decay), this.params.dt);
    }
  }

  test_graph() {
    let num_els = 4;
    let positions = [[width / 2, 10], [10, height / 2], [width - 10, height / 2], [width / 2, height - 10]]
    let graph = new Graph();
    let node_list = []; // I don't like this.
    for (let i = 0; i < num_els; i++) {
      let node = new Node(positions[i]);
      node_list.push(node);
      graph.add_node(node);
      for (let j = 0; j < i; j++) {
        graph.add_edge(node, node_list[j]);
      }
    }
    graph.remove_edge(Array.from(graph.edges)[0]);
    this.nest_node = Array.from(graph.nodes)[0];
    this.food_nodes = [Array.from(graph.nodes)[1]];
    Array.from(graph.nodes)[1].food = 1; // todo: make nice
    this.nest_node.is_nest=true;
    return graph;
  }


  display() {
    this.graph.display();
    for (let ant of this.ants) {
      ant.display();
    }
  }
}

class Node {
  constructor(position) {
    this.position = position;
    this.edges = new Set();
    this.food = 0;
    this.is_nest = false;
  }

  has_edge(edge) {
    return this.edges.has(edge);
  }

  find_edge(other_node) {
    for (let edge of this.edges) {
      if (edge.other_node(this) === other_node) {
        return edge;
      }
    }
    console.log("Edge not found!");
  }

  display() {
    stroke(200);
    strokeWeight(2);
    fill(100);
    if (this.food > 0) {
      fill(100, 10, 10);
    }
    if (this.is_nest) {
      fill(30,150,50);
    }
    ellipse(this.position[0], this.position[1], 50, 50);
  }
}

class Edge {
  constructor(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    node1.edges.add(this);
    node2.edges.add(this);
    this.weight = distance(node1.position, node2.position);
    this.pheromone = 0.1;
    this.del_x = node2.position[0] - node1.position[0];
    this.del_y = node2.position[1] - node1.position[1];
  }

  other_node(node) {
    if (this.node1 === node) {
      return this.node2;
    } else if (this.node2 === node) {
      return this.node1;
    } else {
      console.log("Node is not connected to edge");
      return null;
    }
  }

  has_node(node) {
    return this.node1===node || this.node2 === node;
  }

  get_position(start_node, progress) {
    let ratio = progress;
    if (this.node2 === start_node) {
      ratio = - progress;
    } else if (this.node1 !== start_node) {
      console.log("Start node is not connected to edge");
    }
    return [start_node.position[0] + ratio * this.del_x, start_node.position[1] + ratio * this.del_y];
  }

  display() {
    stroke(127*(2 - this.pheromone));
    line(this.node1.position[0], this.node1.position[1], this.node2.position[0], this.node2.position[1]);
  }
}

class Graph {
  constructor() {
    this.nodes = new Set();
    this.edges = new Set();
  }

  add_node(node) {
    this.nodes.add(node);
  }

  remove_node(node) {
    this.nodes.delete(node);
  }

  add_edge(node1, node2) {
    let edge_exists_already = false;
    for (let edge of node1.edges) {
      edge_exists_already |= edge.other_node(node1) == node2;
    }
    if (edge_exists_already) {
      console.log("Edge cannot be added, it already exists");
    }
    let edge = new Edge(node1, node2);
    this.edges.add(edge);
  }

  remove_edge(edge) {
    if (this.edges.has(edge)) {
      this.edges.delete(edge);
      edge.node1.edges.delete(edge);
      edge.node2.edges.delete(edge);
    } else {
      console.log("Edge not present, can't be removed!");
    }
  }

  display() {
    for (let node of this.nodes) {
      node.display();
    }
    for (let edge of this.edges) {
      edge.display();
    }
  }
}

class Ant {
  constructor(scene) {
    this.scene = scene;
    this.is_back_tracing = false;
    this.back_trace_list = [];
    this.from_node = null;
    this.edge = null;
    this.to_node = scene.nest_node;
    this.progress_on_edge = 0;
    this.has_food = false;
    this.radius = 12
    this.back_trace = true;
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
    let position = this.get_position();
    ellipse(position[0], position[1], this.radius, this.radius);
  }

  walk(dt) {
    let progress = dt * this.scene.params.ant_speed;
    this.progress_on_edge += progress / this.edge.weight;
    this.position = this.get_position();
    if (this.has_food) {
      this.deposit_pheromone();
    }
    if (this.progress_on_edge >= 1) {
      if (this.at_food() && !this.has_food) {
        this.has_food = true;
        this.is_back_tracing = true;
        this.back_trace_list.push(this.from_node);
      } else if (this.at_nest() && this.has_food) {
        this.has_food = false;
        console.log("Dropping off food")
        this.is_back_tracing = false;
        this.back_trace_list = [this.scene.nest_node];
      }
      this.pick_new_edge();
    }
  }

  get_position() {
    return this.edge.get_position(this.from_node, this.progress_on_edge);
  }

  deposit_pheromone() {
    let addition = this.scene.params.pheromone_deposit * this.scene.params.dt / this.edge.weight;
    this.edge.pheromone += addition;
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
      this.edge = this.to_node.find_edge(this.from_node);
    } else{ 
      let edges = []; // Not sure if I should stick to sets. Very low indexes anyway.
      let total_pheromone = 0;
      for (let edge of this.from_node.edges) { // how do I force error checking?
        let add_edge = false;
        if (!edge.has_node(prev_node)) {
          add_edge = true;
        } else if (this.from_node.edges.size==1) {
          add_edge = true;
        } else  if (this.at_nest() || this.at_food()) {
          add_edge = true;
        }
        if (add_edge) {
          edges.push(edge);
          total_pheromone += edge.pheromone;
        }
      }
      let it = -1;
      let pher_indicator = random(0, total_pheromone);
      do {
        it++;
        pher_indicator -= edges[it].pheromone;
      } while (pher_indicator > 0);
      this.to_node = edges[it].other_node(this.from_node);
      this.edge = edges[it];
    }
    this.progress_on_edge = 0;
  }

  at_nest() {
    // Assuming a node is reached
    return this.to_node === this.scene.nest_node;
  }

  at_food() {
    // Assuming a node is reached
    return this.scene.food_nodes.indexOf(this.to_node) >= 0;
  }
}



// Todo: Opaque the paths with the pheromone
