/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {ArcHost} from '../../lib/arc-host.js';
import {Modality, ModalityHandler} from '../../lib/arcs.js';
import {SlotComposer} from '../../lib/arcs.js';
import {Utils} from '../../lib/utils.js';

const log = Xen.logFactory('WebArc', '#cb23a6');

const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    [slotid="modal"] {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
      pointer-events: none;
    }
  </style>
  <div slotid="toproot"></div>
  <div slotid="root"></div>
  <div slotid="modal"></div>
`;

/*
 * TODO(sjmiles): this is messed up, fix:
 * `config.manifest` is used by Utils.spawn to bootstrap a recipe
 * `manifest` is used by WebArc to add a recipe
 */

// config = {id, [serialization], [manifest]}

export class WebArc extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
  get template() {
    return template;
  }
  _didMount() {
    this.containers = {
      toproot: this.host.querySelector('[slotid="toproot"]'),
      root: this.host.querySelector('[slotid="root"]'),
      modal: this.host.querySelector('[slotid="modal"]')
    };
  }
  update(props, state) {
    const {storage, config, manifest, plan} = props;
    if (!state.host && storage && config) {
      this.state = {host: this.createHost()};
    }
    if (state.host && config && config !== state.config) {
      this.disposeArc(state.host);
      this.state = {config, arc: null};
    }
    if (!state.arc && config && state.host) {
      this.awaitState('arc', async () => this.spawnArc(state.host, config));
    }
    // will attempt to instantiate first recipe in `manifest`
    if (state.host && state.manifest !== manifest) {
      this.state = {manifest};
      if (manifest) {
        state.host.manifest = manifest;
      }
    }
    if (plan && state.host && plan !== state.plan) {
      state.host.plan = state.plan = plan;
    }
  }
  createHost() {
    log('creating host');
    let {context, storage, composer, config} = this.props;
    if (config.suggestionContainer) {
      this.containers.suggestions = config.suggestionContainer;
    }
    if (!composer) {
      composer = new SlotComposer({
        modalityName: Modality.Name.Dom,
        modalityHandler: ModalityHandler.domHandler,
        containers: this.containers}
      );
    }
    return new ArcHost(context, storage, composer);
  }
  disposeArc(host) {
    log('disposing arc');
    host.disposeArc();
    this.fire('arc', null);
  }
  async spawnArc(host, config) {
    log(`spawning arc [${config.id}]`);
    const arc = await host.spawn(config);
    log(`arc spawned [${config.id}]`);
    this.fire('arc', arc);
    return arc;
  }
}
customElements.define('web-arc', WebArc);
