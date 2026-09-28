require("FontVGA8").add(Graphics);

class GadgetBridgeMediaControl {
  constructor() {
    this.self = this;
    this.layout = null;

    this.scroll_interval_id = null;

    this.last_music_info_event_time = null;
    this.last_music_state_event_time = null;
    this.last_music_state = "";
    this.last_music_duration = -1;

    // Ref: https://www.espruino.com/Gadgetbridge
    this.music_data = {
      state: "play",
      shuffle: false,
      repeat: false,
      position: -1,
      duration: -1,
      track_title: "-----",
      artist_name: "---",
      album_name: "--",
      track_count: -1,
      track_index: -1,
    };
  }

  // play, pause, playpause, next, previous, volumeup, volumedown
  send_music_command(command) {
    Bluetooth.println("");
    Bluetooth.println(JSON.stringify({ t: "music", n: command }));

    // vibrate watch as tactile feedback that command was submitted
    Bangle.buzz();
  }

  handle_music_event(e) {
    switch (e.t) {
      case "musicstate":
        instance.handle_music_state_event(e);
        break;
      case "musicinfo":
        instance.handle_music_info_event(e);
        break;
      case "modify":
        if (e.id === "music") {
          instance.handle_music_info_event(e);
        }
        break;
    }
  }

  handle_music_info_event(e) {
    instance.last_music_info_event_time = Date.now();

    instance.music_data.track_title = e.track || "-----";
    instance.music_data.artist_name = e.artist || "---";
    instance.music_data.album_name = e.album || "--";

    instance.music_data.duration = e.dur || -1;
    instance.music_data.track_count = e.c || -1;
    instance.music_data.track_index = e.n || -1;

    // We might get "musicinfo" without a "musicstate" so reset position if the song duration changes
    if (
      instance.last_music_duration !== instance.music_data.duration &&
      instance.music_data.duration > 0
    ) {
      instance.last_music_duration = instance.music_data.duration;

      instance.music_data.position = 0;
    }

    instance.update();
  }

  handle_music_state_event(e) {
    instance.last_music_state_event_time = Date.now();

    instance.music_data.state = e.state || "";
    instance.music_data.position = e.position;
    instance.music_data.shuffle = e.shuffle === 1;
    instance.music_data.repeat = e.repeat === 1;

    // OUR PLAYBACK STATE HAS CHANGED!
    if (instance.last_music_state !== instance.music_data.state) {
      instance.last_music_state = instance.music_data.state;

      // if paused then stop auto incrementing position
      // if play then auto increment position

      instance.update();
    }
  }

  // Toggle playback when button is pressed momentarily
  handle_btn_event(e) {
    if (e.pin == BTN1 && e.time - e.lastTime <= 50) {
      // prevent toggling playback when exiting app
      instance.send_music_command("playpause");
    }
  }

  // Handle swipe gestures left/right for prev/next and up/down for volumeup/volumedown
  handle_swipe_event(left_right, up_down) {
    if (left_right !== 0) {
      // next track
      if (left_right < 0) {
        instance.send_music_command("next");
      }
      // previous track
      else {
        instance.send_music_command("previous");
      }
    }

    if (up_down !== 0) {
      // volume up
      if (up_down < 0) {
        instance.send_music_command("volumeup");
      }
      // volume down
      else {
        instance.send_music_command("volumedown");
      }
    }
  }

  callback_skip_backward() {
    instance.send_music_command("previous");
  }

  callback_toggle_play_pause() {
    instance.send_music_command("playpause");
  }

  callback_skip_forward() {
    instance.send_music_command("next");
  }

  format_track_time(number) {
    if (number < 0) {
      return "--:--";
    }

    let hours = number / 60 / 60;
    let minutes = (number / 60) % 60;
    let seconds = number % 60;

    if (Math.floor(hours) > 0) {
      // "HH:MM:SS"
      return `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.floor(minutes)).padStart(2, "0")}:${String(Math.floor(seconds)).padStart(2, "0")}`;
    } else {
      // "MM:SS"
      return `${String(Math.floor(minutes)).padStart(2, "0")}:${String(Math.floor(seconds)).padStart(2, "0")}`;
    }
  }

  track_progress() {
    if (instance.music_data.position < 0 || instance.music_data.duration < 0) {
      return 0.0;
    }

    let n = instance.music_data.position / instance.music_data.duration;

    if (isNaN(n) || n === Number.NEGATIVE_INFINITY) {
      return 0.0;
    } else if (n === Number.POSITIVE_INFINITY) {
      return 1.0;
    } else if (n > 1.0) {
      return 1.0;
    } else if (n < 0.0) {
      return 0.0;
    }

    return n;
  }

  animate_scroller(item) {
    const scroll_step = 20;

    // FIXME? scrolling labels take the better part of a second to redraw, see if it can be sped up at all...
    if (item.oversized && item.scrollable) {
      item.offset_x += scroll_step;
      return true;
    }

    return false;
  }

  render_scroller(item) {
    const scroll_padding = 40;
    var gfx = g;
    var rnd = Math.round;

    const font_size = rnd((gfx.getHeight() * item.font.slice(0, -1)) / 100);
    gfx.setFont("Vector", font_size).setColor(item.col).setBgColor(item.bgCol);

    const label_width = gfx.stringWidth(item.label) + scroll_padding;

    // Do we need to scroll?
    item.oversized = label_width > Bangle.appRect.x + Bangle.appRect.w;

    if (item.oversized) {
      item.offset_x = item.offset_x % label_width;

      gfx
        .setFontAlign(-1, 0)
        .drawString(item.label, item.x - item.offset_x, item.y + (item.h >> 1))
        .drawString(
          item.label,
          item.x - item.offset_x + scroll_padding + label_width,
          item.y + (item.h >> 1)
        );
    } else {
      item.offset_x = 0;

      gfx
        .setFontAlign(0, 0)
        .drawString(item.label, item.x + (item.w >> 1), item.y + (item.h >> 1));
    }
  }

  scroll() {
    let a = instance.animate_scroller(instance.layout.track_title);
    let b = instance.animate_scroller(instance.layout.artist_name);
    let c = instance.animate_scroller(instance.layout.album_name);

    if (a || b || c) {
      instance.layout.update();
      instance.layout.render();
    }
  }

  render_progress_bar(item) {
    g.setColor(255, 255, 255);
    // border
    g.drawRect(
      item.x + item.pad,
      item.y,
      item.x + item.w - item.pad * 2,
      item.y + item.h - item.pad * 2
    );
    // bar
    let bar_width = (item.x + item.w - item.pad * 2 - 2) * item.progress;
    if (bar_width > 0) {
      // prevent bar from clipping through border when progress ratio is close to zero
      g.fillRect(
        item.x + item.pad + 2,
        item.y + 2,
        bar_width,
        item.y + item.h - 2 - item.pad * 2
      );
    }
  }

  ui_layout() {
    const primary_color = g.toColor(255, 255, 255); // WHITE
    const secondary_color = g.toColor(10, 10, 10); // 0x0ff; // 0x252525; // GRAY (dithered)
    const background_color = g.toColor(0, 0, 0); // BLACK

    const Layout = require("Layout");

    this.layout = new Layout(
      {
        type: "v",
        bgCol: background_color,
        c: [
          // LABELS
          {
            type: "txt",
            id: "clock",
            col: secondary_color,
            font: "VGA8",
            pad: 12,
            label: "12:00",
          },

          {
            type: "custom",
            id: "track_title",
            col: primary_color,
            fillx: 1,
            filly: 5,
            font: "12%",
            label: "Song Name Goes Here",
            pad: 6,
            render: instance.render_scroller,
            offset_x: 0,
            oversized: false,
            scrollable: false,
          },
          {
            type: "custom",
            id: "artist_name",
            col: secondary_color,
            fillx: 1,
            filly: 1,
            font: "8%",
            label: "Artist Name Goes Here",
            pad: 6,
            render: instance.render_scroller,
            offset_x: 0,
            oversized: false,
            scrollable: false,
          },
          {
            type: "custom",
            id: "album_name",
            col: secondary_color,
            fillx: 1,
            filly: 1,
            font: "8%",
            label: "Album Name Goes Here",
            pad: 6,
            render: instance.render_scroller,
            offset_x: 0,
            oversized: false,
            scrollable: false,
          },
          // PLAYBACK TIMES
          {
            type: "h",
            fillx: 1,
            c: [
              {
                type: "txt",
                id: "playback_elapsed",
                col: primary_color,
                fillx: 0,
                halign: -1,
                font: "VGA8",
                pad: 1,
                label: "99:00:00",
              },
              { fillx: 1 },
              {
                type: "txt",
                id: "playback_total",
                col: primary_color,
                fillx: 0,
                halign: 1,
                font: "VGA8",
                pad: 1,
                label: "00:00:99",
              },
            ],
          },
          // PLAYBACK PROGRESS BAR
          {
            type: "custom",
            id: "playback_progress",
            render: this.render_progress_bar,
            fillx: 1,
            filly: 0,
            height: 8,
            pad: 1,
            progress: 1.0,
          },
          // PLAYBACK CONTROL BUTTONS
          {
            type: "h",
            fillx: 1,
            c: [
              { filly: 0.5 },
              {
                type: "btn",
                id: "skip_backward",
                label: "|<<",
                cb: instance.callback_skip_backward,
              },
              { fillx: 1 },
              {
                type: "btn",
                id: "toggle_play_pause",
                label: "||",
                cb: instance.callback_toggle_play_pause,
              },
              { fillx: 1 },
              {
                type: "btn",
                id: "skip_forward",
                label: ">>|",
                cb: instance.callback_skip_forward,
              },
            ],
          },
        ],
      },
      { lazy: true }
    );

    this.layout.render();
    //this.layout.debug(); // DEBUG LAYOUT
  }

  setup() {
    Bangle.loadWidgets();
    Bangle.drawWidgets();

    this.ui_layout();

    setWatch(instance.handle_btn_event, BTN1, {
      repeat: true,
      edge: "falling",
      debounce: 10,
    });
    Bangle.on("swipe", instance.handle_swipe_event);

    if (globalThis.GB !== undefined) {
      Bangle.on("GB", instance.handle_music_event);
    }

    instance.update();

    // Beep boop beep
    setInterval(instance.update, 1000);
  }

  update() {
    if (instance.layout == undefined) {
      return;
    }

    let data_changed = false;

    // Mutate: increment track position by 1 if we're in the "play" state
    if (
      instance.music_data.state === "play" &&
      instance.music_data.position < instance.music_data.duration &&
      instance.music_data.duration > 0
    ) {
      instance.music_data.position += 1;
      data_changed = true;
    }

    // Clock
    let d = new Date();
    let is_hh = require("locale").is12Hours();
    let meridian = is_hh ? "" : require("locale").meridian(d);

    let time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${is_hh ? "" : " " + meridian}`;

    if (instance.layout.clock.label !== time) {
      data_changed = true;
    }
    instance.layout.clock.label = time;

    // Track metadata
    if (instance.layout.track_title.label !== instance.music_data.track_title) {
      data_changed = true;
    }
    instance.layout.track_title.label = instance.music_data.track_title;

    if (instance.layout.artist_name.label !== instance.music_data.artist_name) {
      data_changed = true;
    }
    instance.layout.artist_name.label = instance.music_data.artist_name;

    if (instance.layout.album_name.label !== instance.music_data.album_name) {
      data_changed = true;
    }
    instance.layout.album_name.label = instance.music_data.album_name;

    // -- TODO: Scroll track metadata labels if screen is NOT locked (assume that a locked screen isn't being looked at)
    // -- TODO: Add some delay so text will scroll for several seconds after button is pressed in case screen autolock timeout is short
    //if (!instance.scroll_interval_id) {
    //  instance.scroll_interval_id = setInterval(instance.scroll, 200);
    //}

    // Track timeline
    // -- if position has changed then these will also get updated
    instance.layout.playback_elapsed.label = instance.format_track_time(
      instance.music_data.position
    );
    instance.layout.playback_total.label = instance.format_track_time(
      instance.music_data.duration
    );
    instance.layout.playback_progress.progress = instance.track_progress();

    // Playback state
    instance.layout.toggle_play_pause.label =
      instance.music_data.state === "play" ? "||" : " > ";

    if (data_changed) {
      instance.layout.update();
      instance.layout.render();
    }
  }
}

let instance = new GadgetBridgeMediaControl();
instance.setup();
