let scene;
let size_x = 800;
let size_y = 800;
function setup() {
  createCanvas(size_x, size_y);
  scene = new Scene();
}

function draw() {
  background(200);
  scene.time += scene.params.dt;
  scene.move();
  scene.display();
}

function distance(pos1, pos2) {
  let del_x = pos1[0] - pos2[0];
  let del_y = pos1[1] - pos2[1];
  return Math.sqrt(del_x * del_x + del_y * del_y);
}

class Params {
  constructor() {
    this.num_ants = 70;
    this.num_vertices = 150;
    this.ant_size = 12;
    this.ant_speed = 10;
    this.pheromone_decay = 0.0005;
    this.pheromone_deposit = 10;
    this.time_delay = 10;
    this.dt = 0.2;
    this.arbitraryness = 0.0;
  }
}

class Scene {
  constructor() {
    this.time = 0;
    this.counter = 0;
    this.params = new Params();
    this.nest_vertex = null;
    this.food_vertices = [];
    this.graph = this.geometric_graph();
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
    let vertex_list = []; // I don't like this. Make graphs have vertex list
    for (let i = 0; i < num_els; i++) {
      let vertex = new Vertex(positions[i]);
      vertex_list.push(vertex);
      graph.add_vertex(vertex);
      for (let j = 0; j < i; j++) {
        graph.add_edge(vertex, vertex_list[j]);
      }
    }
    graph.remove_edge(Array.from(graph.edges)[0]);
    this.nest_vertex = Array.from(graph.vertices)[0];
    this.food_vertices = [Array.from(graph.vertices)[1]];
    Array.from(graph.vertices)[1].food = 1; // todo: make nice
    this.nest_vertex.is_nest = true;
    return graph;
  }

  geometric_graph() {
    let graph = new Graph();
    do {
      graph.clear();
      let vertex_list = [];
      let max_dist = 100;
      for (let i = 0; i < this.params.num_vertices; i++) {
        let vertex = new Vertex([random() * size_x, random() * size_y]);
        graph.add_vertex(vertex);
        vertex_list.push(vertex);
        for (let j = 0; j < i; j++) {
          if (distance(vertex.position, vertex_list[j].position) < max_dist) {
            graph.add_edge(vertex, vertex_list[j]);
            console.log("Edge added on distance ",distance(vertex.position, vertex_list[j].position))
          }
        }
      }
      this.nest_vertex = Array.from(graph.vertices)[0];
      this.food_vertices = [Array.from(graph.vertices)[1]];
      Array.from(graph.vertices)[1].food = 1; // todo: make nice
      this.nest_vertex.is_nest = true;
    } while (!graph.has_path(this.nest_vertex, this.food_vertices[0]));
    return graph;
  }


  display() {
    this.graph.display();
    for (let ant of this.ants) {
      ant.display();
    }
  }
}

class Vertex {
  constructor(position) {
    this.position = position;
    this.edges = new Set();
    this.food = 0;
    this.is_nest = false;
  }

  has_edge(edge) {
    return this.edges.has(edge);
  }

  find_edge(other_vertex) {
    for (let edge of this.edges) {
      if (edge.other_vertex(this) === other_vertex) {
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
      fill(30, 150, 50);
    }
    ellipse(this.position[0], this.position[1], 20, 20);
  }
}

class Edge {
  constructor(vertex1, vertex2) {
    this.vertex1 = vertex1;
    this.vertex2 = vertex2;
    vertex1.edges.add(this);
    vertex2.edges.add(this);
    this.weight = distance(vertex1.position, vertex2.position);
    this.pheromone = 0.1;
    this.del_x = vertex2.position[0] - vertex1.position[0];
    this.del_y = vertex2.position[1] - vertex1.position[1];
  }

  other_vertex(vertex) {
    if (this.vertex1 === vertex) {
      return this.vertex2;
    } else if (this.vertex2 === vertex) {
      return this.vertex1;
    } else {
      console.log("Vertex is not connected to edge");
      return null;
    }
  }

  has_vertex(vertex) {
    return this.vertex1 === vertex || this.vertex2 === vertex;
  }

  get_position(start_vertex, progress) {
    let ratio = progress;
    if (this.vertex2 === start_vertex) {
      ratio = - progress;
    } else if (this.vertex1 !== start_vertex) {
      console.log("Start vertex is not connected to edge");
    }
    return [start_vertex.position[0] + ratio * this.del_x, start_vertex.position[1] + ratio * this.del_y];
  }

  display() {
    stroke(127 * (this.pheromone - 2));
    line(this.vertex1.position[0], this.vertex1.position[1], this.vertex2.position[0], this.vertex2.position[1]);
  }
}

class Graph {
  constructor() {
    this.vertices = new Set();
    this.edges = new Set();
    this.valid = false;
  }

  add_vertex(vertex) {
    this.vertices.add(vertex);
  }

  remove_vertex(vertex) {
    this.vertices.delete(vertex);
  }

  add_edge(vertex1, vertex2) {
    let edge_exists_already = false;
    for (let edge of vertex1.edges) {
      edge_exists_already = edge_exists_already || edge.other_vertex(vertex1) == vertex2;
    }
    if (edge_exists_already) {
      console.log("Edge cannot be added, it already exists");
    }
    let edge = new Edge(vertex1, vertex2);
    this.edges.add(edge);
  }

  remove_edge(edge) {
    if (this.edges.has(edge)) {
      this.edges.delete(edge);
      edge.vertex1.edges.delete(edge);
      edge.vertex2.edges.delete(edge);
    } else {
      console.log("Edge not present, can't be removed!");
    }
  }

  has_path(vertex1, vertex2) {
    let reachable_vertices = new Set();
    let unexplored_vertices = new Set([vertex1]);
    let explored_vertices = new Set();
    console.log("Checking paths");
    while (unexplored_vertices.size > 0) {
      let uv_list = Array.from(unexplored_vertices);
      for (let vertex of uv_list) {
        unexplored_vertices.delete(vertex);
        explored_vertices.add(vertex)
        for (let edge of vertex.edges) {
          let nb_vertex = edge.other_vertex(vertex);
          reachable_vertices.add(nb_vertex);
          unexplored_vertices.delete(nb_vertex);
          if (!explored_vertices.has(nb_vertex)) {
            unexplored_vertices.add(nb_vertex);
          }

        }
      }
    }
    return reachable_vertices.has(vertex2);
  }

  clear() {
    this.vertices.clear();
    this.edges.clear();
  }

  display() {
    for (let edge of this.edges) {
      edge.display();
    }
    for (let vertex of this.vertices) {
      vertex.display();
    }
  }
}

class Ant {
  constructor(scene) {
    this.scene = scene;
    this.is_back_tracing = false;
    this.back_trace_list = [];
    this.from_vertex = null;
    this.edge = null;
    this.to_vertex = scene.nest_vertex;
    this.progress_on_edge = 0;
    this.has_food = false;
    this.radius = 12
    this.back_trace = true;
    this.pick_new_edge();
  }

  display() {
    fill(207,136,100);
    if (this.has_food) {
      fill(98,171,204);
    }
    stroke(200,0.5);
    strokeWeight(2);
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
        this.back_trace_list.push(this.from_vertex);
      } else if (this.at_nest() && this.has_food) {
        this.has_food = false;
        console.log("Dropping off food")
        this.is_back_tracing = false;
        this.back_trace_list = [this.scene.nest_vertex];
      }
      this.pick_new_edge();
    }
  }

  get_position() {
    return this.edge.get_position(this.from_vertex, this.progress_on_edge);
  }

  deposit_pheromone() {
    let addition = this.scene.params.pheromone_deposit * this.scene.params.dt / this.edge.weight;
    this.edge.pheromone += addition;
  }

  pick_new_edge() {
    let prev_vertex = this.from_vertex;
    if (this.back_trace && !this.is_back_tracing) {
      this.back_trace_list.push(prev_vertex);
    }
    this.from_vertex = this.to_vertex;
    if (this.has_food && this.back_trace && this.is_back_tracing) {
      this.to_vertex = this.back_trace_list[this.back_trace_list.length - 1];
      let first_occurence = this.back_trace_list.indexOf(this.to_vertex);
      this.back_trace_list = this.back_trace_list.slice(0, first_occurence);
      this.edge = this.to_vertex.find_edge(this.from_vertex);
    } else {
      let edges = []; // Not sure if I should stick to sets. Very low indexes anyway.
      let total_pheromone = 0;
      for (let edge of this.from_vertex.edges) { // how do I force error checking?
        let add_edge = false;
        if (!edge.has_vertex(prev_vertex)) {
          add_edge = true;
        } else if (this.from_vertex.edges.size == 1) {
          add_edge = true;
        } else if (this.at_nest() || this.at_food()) {
          add_edge = true;
        }
        if (add_edge) {
          edges.push(edge);
          total_pheromone += edge.pheromone;
        }
      }
      if (edges.length == 0) {
        console.log("No walking options from vertex ", this.from_vertex);
        console.log("Edges connected are ", this.from_vertex.edges);
      }
      let it = -1;
      let pher_indicator = random(0, total_pheromone);
      do {
        it++;
        pher_indicator -= edges[it].pheromone;
      } while (pher_indicator > 0);
      this.to_vertex = edges[it].other_vertex(this.from_vertex);
      this.edge = edges[it];
    }
    this.progress_on_edge = 0;
  }

  at_nest() {
    // Assuming a vertex is reached
    return this.to_vertex === this.scene.nest_vertex;
  }

  at_food() {
    // Assuming a vertex is reached
    return this.scene.food_vertices.indexOf(this.to_vertex) >= 0;
  }
}



// Todo: Opaque the paths with the pheromone
