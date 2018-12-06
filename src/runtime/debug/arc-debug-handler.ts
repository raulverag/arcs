/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {enableTracingAdapter} from './tracing-adapter.js';
import {Arc} from '../arc.js';
import {ArcPlannerInvoker} from './arc-planner-invoker.js';
import {ArcStoresFetcher} from './arc-stores-fetcher.js';
import {DevtoolsChannel} from '../../platform/devtools-channel-web.js';
import {DevtoolsConnection} from './devtools-connection.js';
import {Particle} from '../recipe/particle.js';

// Arc-independent handlers for devtools logic.
DevtoolsConnection.onceConnected.then(devtoolsChannel => {
  enableTracingAdapter(devtoolsChannel);
});

export class ArcDebugHandler {
  _devtoolsChannel: DevtoolsChannel = null;
  _arcId: string;
  _isSpeculative: boolean;
  
  constructor(arc: Arc) {
    this._arcId = arc.id.toString();
    this._isSpeculative = arc.isSpeculative;

    DevtoolsConnection.onceConnected.then(devtoolsChannel => {
      this._devtoolsChannel = devtoolsChannel;
      if (!arc.isSpeculative) {
        // Message handles go here.
        const arcPlannerInvoker = new ArcPlannerInvoker(arc, devtoolsChannel);
        const arcStoresFetcher = new ArcStoresFetcher(arc, devtoolsChannel);
      }

      this._devtoolsChannel.send({
        messageType: 'arc-available',
        messageBody: {
          id: arc.id.toString(),
          isSpeculative: arc.isSpeculative
        }
      });
    });
  }

  recipeInstantiated({particles}: {particles: Particle[]}) {
    if (!this._devtoolsChannel || this._isSpeculative) return;

    const truncate = ({id, name}) => ({id, name});
    const slotConnections = [];
    particles.forEach(p => Object.values(p.consumedSlotConnections).forEach(cs => {
      slotConnections.push({
        arcId: this._arcId,
        particleId: cs.particle.id,
        consumed: truncate(cs.targetSlot),
        provided: Object.values(cs.providedSlots).map(slot  => truncate(slot)),
      });
    }));
    this._devtoolsChannel.send({
      messageType: 'recipe-instantiated',
      messageBody: {slotConnections}
    });
  }
}