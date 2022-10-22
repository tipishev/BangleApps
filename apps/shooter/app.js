// constants
const WIDTH = g.getWidth(),
  HEIGHT = g.getHeight();
const PI = Math.PI;
const BUTTON_RADIUS = WIDTH / 4;
const STEP_SIZE = 1;
const COLORS = {
  // pure colors
  'black': '#000',

  'red': '#F00',
  'green': '#0F0',
  'blue': '#00F',

  'yellow': '#FF0',
  'cyan': '#0FF',
  'magenta': '#F0F',

  'white': '#FFF',

  // dithery colors
  'orange': '#FFA500',
  'grey': '#57595D',
  'dark_red': '#7D0000',
  'dark_green': '#007D00',

};
const WALL = 1;
const NO_WALL = 0;

const WEST = PI;

const w = WALL; // wall
const o = NO_WALL; // no-wall
const CELLS = [
  // y   0  1  2  3  4  5      x
  [w, w, w, w, w, w], // 0
  [w, o, o, o, o, w], // 1
  [w, o, o, o, o, w], // 2
  [w, w, o, w, w, w], // 3
  [w, o, o, o, w, w], // 4
  [w, o, o, o, w, w], // 5
  [w, w, w, w, w, w], // 6
];

const gun_image = () => {
  return require("heatshrink").decompress(atob("vVvwcBkmSpICSyfHggXUAStP/4sqpM8uAsqkmAUKy2/AQVIgESW34CX/+Ag/gFk9PjlwgEcuPBLM0ggAAD8hcmLIMAgPHjlyFkuQgH///48EAhKJloCzB//8L4IsmgeAWoU48ESRMkAuKzBAQVwW0sOLAMOnDnCFkmR4AoBLIUHgi2kvC0C8a5BgYskpMcFgK2CL4QsjkEAnH/AARcBgBcjwPH/hZBjl/LgMCRMcA//+nEAh//8EAhIsip6zB4CzB4C5CW0oACLgIAB8C2j+JZBgEHjlwgEcuQsixxaDgeAAgU5FkOT44tDWYK5B48ERMNIFga2EgESccy2DAAK2iWAa2FgIshySIEWwQABW362/W34CZoAsDh//8AGDRMJZF/i2DRMSIE//+AoaJhyAlCg8cv62DgESW362ZgAsgkC2KRMOAWxSJhEoi2GgIsfpC2LghZjWxDmdyAiFWxDmdoAjGWwzmdpgiGWw64CXLUgFoy2JRLeAWyCJaFgy2LgAsYyYhHWxMAiC2YpAtHWxUCLK+mEI62Lg0YsAvUpnSLRC2KgUIkIsToxEBWyUAsOGiCMTAIJaIWxUAkmCgEJFh/hw0YsOAWxJcBjgLGgkavOmzEScBwEBhEgJxEDx//8Y6Ipu06dIFhvpLISeBLJP///x44NGgO3z150JZNmgEBkCeBLJIAB/HgRI/7tu04gsLyJZDjFgWZQCEB4sbvPnWxcmLYVNmibBWxIAMhs06VJhJZMtOmzVpwwcFji8HWAJcEgMmzR3BFhPJWAJZCAQOQKqEDxwFDwYaBySJIWYZZCAQK2DKAK5IKwYFEpK2BsC2IsGCSgJZCAQJUKh048AMJm3bpMhFg9OLIOGLIa2EWY1x//8uPABAgFDj15w0EWw8yhEkya2Pn///4sEgE4AYUCtu0wC2I8K2BLIemzFAFhEHj//WAhrFgOnWwMAFg3MgBZF6YsJgEDLQP8YhXTpADBFguT0hZFAQOEDxK2IMoIDCjTRCgSJFGwMJLIgCBJhQANEAOAAYKJFkFBwxZEWwIeJg8cuAKHBAUBgy2JwCLBLIVt23bLTCFBAYQsFyEEWwd58+evItZgOHLgK2FoC+BWYRZBtuwFrMAzcIgKJFgC2DLIXmZAK2JFh0YvOGQAOhF4a+BWwM2LIO24RaagMwwVJm3QFgWRWwZZBLgL1BFjMGzFhw2esS2HLIPbtgfMwVIBxkThCAC2iJCiC2G8BKK4EQJQIsLiFpWwWnzC2KcZQABhpuBLZhVCmh9BWwUGWwvcKw2EAodB4ynBKYlACoraBNYKABwK2JcY5iEgmTpMwLRYjBQAU0wi2CGoa2CRAsEiAFDNwSnBBwjIHBwImBjFgWxG0JRcDhM0ycMWxwCBpEhWw/3zAcLsOn71hX4gAHLIYCBgi2H7AbLQAPTJQOCCJkAwUIkGCFQK2GuKbC48cDQ8aWwVhBwNwg8cuIFCDQUELgmJWw4iCg///wqEh048f5mmAv//AA/ALhEkyA1BWwfmBwQeIAAPEiFBBhP8FotBcAK2CfwK2CH4UDFpUCNAQAIwCeGgS2BGQK2EBgUPC4PxUgNxG4K/BBoSwDuIqCWwgAEcAMJWwMAWwdsBoU/JAn4DY1+XgJZNAAK2ICRIAagi2BgEIWwW0FkcAiVJfYOGLgPnzAtkpK2BkGSpK2BMIIAigMkyMGjS2CuK2jFgK2BydNWwSHkFgNJWYOmzVp80QFseSpmChJZBps26AsjgVJnFhwxZBWwNgFscJk1JkizB2nTpgskkmZ82YtPnz150wZPuPHcad26dJm3bLgPADJ848DjSpMaWYICB8+aoDjkkmAWwNJmi5BW0YsBycELIOGzVp8wsigK2BoAA="));
};

// math
const distance = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
};
const average = (a, b) => (a + b) / 2;
const round_to_2_decimals = (x) => Math.round(x * 100) / 100;

// classes

class Button {
  constructor(options) {
    this.x = options.x;
    this.y = options.y;
    this.label = options.label;
    this.onTouch = options.onTouch;
    this.radius = BUTTON_RADIUS;
  }

  render() {
    g
      .reset()
      .setColor(COLORS.black)
      .drawCircle(this.x, this.y, this.radius)
      .drawCircle(this.x, this.y, this.radius - 1)
      .setColor(COLORS.white)
      .setFont("Vector", 20)
      .drawString(this.label, this.x - this.radius / 2, this.y - this.radius / 2);
  }

  isTouched(some_x, some_y) {
    return distance(this.x, this.y, some_x, some_y) < this.radius;
  }

}
class Player {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }
  turn(angle) {
    this.direction += angle;
    this.direction %= 2 * PI;
    this.direction = round_to_2_decimals(this.direction);
  }
  step(delta) {
    cos = Math.cos(this.direction);
    sin = Math.sin(this.direction);
    this.x += cos * delta;
    this.y += sin * delta;
  }
}


class Camera {
  constructor(focalLength) {

    this.width = WIDTH;
    this.height = HEIGHT * 0.8;
    this.resolution = 10;
    this.spacing = this.width / this.resolution;
    this.focalLength = focalLength || 0.8;
    this.range = 6;
    this.scale = 0.5; //(this.width + this.height) / WIDTH;
  }

  project(height, angle, distance) {
    const z = distance * Math.cos(angle);
    const wallHeight = this.height * height / z;
    const bottom = this.height / 2 * (1 + 1 / z);
    return {
      top: bottom - wallHeight,
      height: wallHeight
    };
  }

  drawColumn(column, ray, angle, map) {
    const left = Math.floor(column * this.spacing);
    const width = Math.ceil(this.spacing);
    let hit = -1;

    while (++hit < ray.length && ray[hit].height <= 0);

    for (let s = ray.length - 1; s >= 0; s--) {
      const step = ray[s];

      if (s === hit) {

        var wall = this.project(step.height, angle, step.distance);

        const x1 = left;
        const y1 = wall.top;
        const x2 = left + width;
        const y2 = wall.top + wall.height;


        g.drawRect(x1, y1, x2, y2);
        g.setColor(COLORS.dark_red);
        g.fillRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
        g.setColor(COLORS.black);
      }
    }
  }

  drawSky() {
    g.setColor(COLORS.blue);
    g.fillRect(0, 0, WIDTH, HEIGHT / 3);
    g.setColor(COLORS.black);
    //g.drawLine(0, HEIGHT, WIDTH/2, HEIGHT/2);
    //g.drawLine(WIDTH, HEIGHT, WIDTH/2, HEIGHT/2);
  }


  drawFloor() {
    g.setColor(COLORS.dark_green);
    g.fillRect(0, HEIGHT / 3, WIDTH, HEIGHT);
    g.setColor(COLORS.black);
    //g.drawLine(0, HEIGHT, WIDTH/2, HEIGHT/2);
    //g.drawLine(WIDTH, HEIGHT, WIDTH/2, HEIGHT/2);
  }

  drawColumns(player, map) {
    for (let column = 0; column < this.resolution; column++) {
      const x = column / this.resolution - 0.5;
      const angle = Math.atan2(x, this.focalLength);
      const ray = map.cast(player, player.direction + angle, this.range);
      this.drawColumn(column, ray, angle, map);
    }
  }

  drawControls(controls) {
    controls.render();
  }

  drawWeapon() {
    g.drawImage(gun_image(), WIDTH / 4, HEIGHT * 0.6, {
      scale: 0.7
    });
  }

  drawMiniMap(player, map) {
    const X_OFFSET = 5;
    const Y_OFFSET = 5;
    const CELL_SIZE = 7;
    g.setBgColor(COLORS.white).clearRect(X_OFFSET, Y_OFFSET, X_OFFSET + CELL_SIZE * map.width, Y_OFFSET + CELL_SIZE * map.height);
    for (let col = 0; col < map.width; col++) {
      for (let row = 0; row < map.height; row++) {
        const x1 = X_OFFSET + col * CELL_SIZE;
        const y1 = Y_OFFSET + row * CELL_SIZE;
        const x2 = X_OFFSET + col * CELL_SIZE + CELL_SIZE;
        const y2 = Y_OFFSET + row * CELL_SIZE + CELL_SIZE;
        g.drawRect(x1, y1, x2, y2);
        if (map.cells[row][col] === WALL) {
          // show walls as black squares
          g.fillRect(x1, y1, x2, y2);
        }
      }

      // draw player marker

      const player_x = player.x;
      const player_y = player.y;
      const sin = Math.sin(player.direction);
      const cos = Math.cos(player.direction);

      const rotate = (point) => {
        return {
          x: (point.x * cos - point.y * sin) + X_OFFSET + player_y * CELL_SIZE,
          y: (point.x * sin + point.y * cos) + Y_OFFSET + player_x * CELL_SIZE
        };
      };

      let p1 = rotate({
        x: -CELL_SIZE / 3,
        y: -CELL_SIZE / 2
      });
      let p2 = rotate({
        x: 0,
        y: CELL_SIZE / 2
      });
      let p3 = rotate({
        x: CELL_SIZE / 3,
        y: -CELL_SIZE / 2
      });


      g.setColor(COLORS.blue);
      g.fillPoly([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y], true);
      g.setColor(COLORS.black);
    }
  }

  render(player, map, controls) {
    //g.clear().setBgColor(COLORS.white);
    this.drawSky();
    this.drawFloor();
    this.drawColumns(player, map);
    this.drawWeapon();
    this.drawMiniMap(player, map);
    //this.drawControls(controls);
  }
}

class Controls {

  constructor() {
    button_left = new Button({
      x: WIDTH / 6,
      y: HEIGHT * 7 / 8,
      label: "<"
    });
    button_right = new Button({
      x: WIDTH * 5 / 6,
      y: HEIGHT * 7 / 8,
      label: ">"
    });
    button_up = new Button({
      x: WIDTH/2,
      y: HEIGHT/2,
      label: "^"
    });
    this.components = [button_left, button_right, button_up];
  }

  findTouchedComponent(x, y) {
    for (const component of this.components) {
      if (component.isTouched(x, y)) {
        return component;
      }
    }
    return null;
  }

  handleTouch(point) {
    for (let component of this.components) {
      if (component.isTouched(point.x, point.y)) {
        return component.label;
      }
    }
    return null; // nothing was touched
  }
  render() {
    for (const component of this.components) {
      component.render();
    }
    return this;
  }
}


class Map {
  constructor(cells) {
    this.cells = cells;
    this.height = cells.length;
    this.width = cells[0].length;
  }

  get(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x > this.width - 1 || y < 0 || y > this.height - 1) return 1;
    return this.cells[x][y];
  }


  cast(point, angle, range) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const noWall = {
      length2: Infinity
    };

    const step = (rise, run, x, y, inverted) => {
      if (run === 0) return noWall;
      const dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
      const dy = dx * (rise / run);
      return {
        x: inverted ? y + dy : x + dx,
        y: inverted ? x + dx : y + dy,
        length2: dx * dx + dy * dy
      };
    };

    const inspect = (step, shiftX, shiftY, distance, offset) => {
      const dx = cos < 0 ? shiftX : 0;
      const dy = sin < 0 ? shiftY : 0;
      step.height = this.get(step.x - dx, step.y - dy);
      step.distance = distance + Math.sqrt(step.length2);
      if (shiftX) step.shading = cos < 0 ? 2 : 0;
      else step.shading = sin < 0 ? 2 : 1;
      step.offset = offset - Math.floor(offset);
      return step;
    };

    const ray = (origin) => {
      const stepX = step(sin, cos, origin.x, origin.y);
      const stepY = step(cos, sin, origin.y, origin.x, true);
      const nextStep = stepX.length2 < stepY.length2 ?
        inspect(stepX, 1, 0, origin.distance, stepX.y) :
        inspect(stepY, 0, 1, origin.distance, stepY.x);
      if (nextStep.distance > range) return [origin];
      return [origin].concat(ray(nextStep));
    };

    return ray({
      x: point.x,
      y: point.y,
      height: 0,
      distance: 0
    });
  }
}

const main = () => {
  const map = new Map(CELLS);
  const player = new Player(5.5, 2.5, WEST);
  const camera = new Camera(0.8);

  Bangle.on("swipe",
    function(directionLR, directionUD){
    if (directionLR === 0 && directionUD === -1) {
      // up
        player.step(+STEP_SIZE);
        camera.render(player, map);
        Bangle.buzz(100);
    } else if (directionLR === -1 && directionUD === 0) {
      // left
        player.turn(-PI / 8);
        camera.render(player, map);
        Bangle.buzz(100);
    } else if (directionLR === +1 && directionUD === 0) {
      // right
        player.turn(+PI / 8);
        camera.render(player, map);
        Bangle.buzz(100);
    } else if (directionLR === 0 && directionUD === 1) {
      // down
        player.step(-STEP_SIZE);
        camera.render(player, map);
        Bangle.buzz(100);
    }
  });

  camera.render(player, map);
};


main();
