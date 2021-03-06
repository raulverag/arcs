/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Manifest} from '../../ts-build/manifest.js';
import {ConvertConstraintsToConnections} from '../../strategies/convert-constraints-to-connections.js';
import {assert} from '../chai-web.js';

describe('ConvertConstraintsToConnections', async () => {

  it('fills out an empty constraint', async () => {
    const recipe = (await Manifest.parse(`
      particle A
        inout S {} b
      particle C
        inout S {} d

      recipe
        A.b -> C.d`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('does not cause an input only handle to be created', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        in S b
      particle C
        in S d

      recipe
        A.b -> C.d`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.isEmpty(results);
  });

  it('can resolve input only handle connection with a mapped handle', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        in S b
      particle C
        in S d

      recipe
        map as handle0
        A.b = C.d`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
  });

  it('can create handle for input and output handle', async () => {
    const createRecipe = async (constraint1, constraint2) => (await Manifest.parse(`
      schema S
      particle A
        in S b
      particle C
        in S d
      particle E
        out S f

      recipe
        ${constraint1}
        ${constraint2}`)).recipes[0];
    const verify = async (constraint1, constraint2) => {
      const recipe = await createRecipe(constraint1, constraint2);
      const inputParams = {generated: [{result: recipe, score: 1}]};
      const cctc = new ConvertConstraintsToConnections({pec: {}});
      const results = await cctc.generate(inputParams);
      assert.lengthOf(results, 1, `Failed to resolve ${constraint1} & ${constraint2}`);
    };
    // Test for all possible combination of connection constraints with 3 particles.
    const constraints = [['A.b = C.d', 'C.d = A.b'], ['A.b -> E.f', 'E.f <- A.b'], ['C.d -> E.f', 'E.f <- C.d']];
    for (let i = 0; i < constraints.length; ++i) {
      for (let j = 0; j < constraints.length; ++j) {
        if (i == j) continue;
        for (let ii = 0; ii <= 1; ++ii) {
          for (let jj = 0; jj <= 1; ++jj) {
            await verify(constraints[i][ii], constraints[j][jj]);
          }
        }
      }
    }
  });

  it('fills out a constraint, reusing a single particle', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        C`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('fills out a constraint, reusing a single particle (2)', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        A`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });


  it('fills out a constraint, reusing two particles', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        C
        A`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('fills out a constraint, reusing two particles and a handle', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        use as handle1
        C
          d = handle1
        A`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('fills out a constraint, reusing two particles and a handle (2)', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        use as handle1
        C
        A
          b = handle1`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('removes an already fulfilled constraint', async () => {
    const recipe = (await Manifest.parse(`
      schema S
      particle A
        inout S b
      particle C
        inout S d

      recipe
        A.b -> C.d
        use as handle1
        C
          d = handle1
        A
          b = handle1`)).recipes[0];
    const inputParams = {generated: [{result: recipe, score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(), `recipe
  use as handle0 // S {}
  A as particle0
    b = handle0
  C as particle1
    d = handle0`);
  });

  it('verifies affordance', async () => {
    const recipes = (await Manifest.parse(`
      schema S
      particle A in 'A.js'
        out S b
        affordance voice
        consume root
      particle C in 'C.js'
        in S d
        affordance voice
        consume root
      particle E in 'E.js'
        in S f
        consume root

      recipe
        A.b -> C.d
      recipe
        A.b -> E.f
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {slotComposer: {affordance: 'voice'}}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.particles.map(p => p.name), ['A', 'C']);
  });

  it('connects to handles', async () => {
    const recipes = (await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        ? as h
        A.o -> h
        h -> B.i
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? as handle0 // S {}
  A as particle0
    o -> handle0
  B as particle1
    i <- handle0`);
  });

  it('connects existing particles to handles', async () => {
    const recipes = (await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        ? as h
        A.o -> h
        h -> B.i
        A
        B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? as handle0 // S {}
  A as particle0
    o -> handle0
  B as particle1
    i <- handle0`);
  });

  it(`doesn't attempt to duplicate existing handles to particles`, async () => {
    const recipes = (await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        ? as h
        A.o -> h
        h -> B.i
        A
          o -> h
        B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? as handle0 // S {}
  A as particle0
    o -> handle0
  B as particle1
    i <- handle0`);
  });

  it(`duplicates particles to get handle connections right`, async () => {
    const recipes = (await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        ? as h
        ? as i
        A.o -> h
        h -> B.i
        A
          o -> i
        B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? as handle0 // ~
  ? as handle1 // S {}
  A as particle0
    o -> handle0
  A as particle1
    o -> handle1
  B as particle2
    i <- handle1`);
  });

  it('connects to tags', async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
    particle B
      out S {} i
    recipe
      ? #hashtag
      A.o -> #hashtag
      #trashbag <- B.i
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? #hashtag as handle0 // ~
  create #trashbag as handle1 // ~
  A as particle0
    o -> handle0
  B as particle1
    i -> handle1`);
  });

  it('connects existing particles to tags', async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
    particle B
      out S {} i
    recipe
      ? #hashtag
      A.o -> #hashtag
      #trashbag <- B.i
      A
      B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? #hashtag as handle0 // ~
  create #trashbag as handle1 // ~
  A as particle0
    o -> handle0
  B as particle1
    i -> handle1`);
  });

  it(`doesn't attempt to duplicate existing connections to tags`, async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
    particle B
      out S {} i
    recipe
      ? #hashtag as handle0
      A.o -> #hashtag
      #trashbag <- B.i
      A
        o -> handle0
      B
        i -> handle0
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  ? #hashtag as handle0 // ~
  A as particle0
    o -> handle0
  B as particle1
    i -> handle0`);
  });

  it(`connects particles together when there's only one possible connection`, async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
    particle B
      in S {} i
    recipe
      A -> B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.equal(recipe.obligations[0].from.instance, recipe.particles[0]);
    assert.equal(recipe.obligations[0].to.instance, recipe.particles[1]);
  });
  
  it(`connects particles together when there's extra things that can't connect`, async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
      in S {} i
    particle B
      in S {} i
      in T {} i2
    recipe
      A -> B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.equal(recipe.obligations[0].from.instance, recipe.particles[0]);
    assert.equal(recipe.obligations[0].to.instance, recipe.particles[1]);
  });

  it(`connects particles together with multiple connections`, async () => {
    const recipes = (await Manifest.parse(`
    particle A
      out S {} o
      in T {} i
    particle B
      in S {} i
      out T {} o
    recipe
      A = B
    `)).recipes;
    const inputParams = {generated: [{result: recipes[0], score: 1}]};
    const cctc = new ConvertConstraintsToConnections({pec: {}});
    const results = await cctc.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.equal(recipe.obligations[0].from.instance, recipe.particles[0]);
    assert.equal(recipe.obligations[0].to.instance, recipe.particles[1]);
  });
});
