const BN = web3.utils.BN;
const Splitter = artifacts.require('./Splitter.sol');


contract('Splitter', accounts => {
  let splitter;
  const [owner, attacker, user1, user2, user3] = accounts;

  beforeEach('setup contract for each test', async () => {
    splitter = await Splitter.new(100, { from: owner});
  });
  
  it('should only enable owner to add peer', async() => {
    try {
      await splitter.addPeer(user1, { from: attacker });
    } catch (err) {
      assert.equal(err.reason, 'Only owner allowed!');
    }
  });

  it('should only enable owner to remove peer', async() => {
    try {
      await splitter.removePeer(user1, { from: attacker });
    } catch (err) {
      assert.equal(err.reason, 'Only owner allowed!');
    }
  });

  it('should split between all peers and return the change to sender', async() => {
    let peerBalancesBefore = new BN(0);
    let peerBalancesAfter = new BN(0);
    let peers = [user1, user2, owner];

    for (let peerAddress of peers) {
      await splitter.addPeer(peerAddress);
      let peer = await splitter.peerMap(peerAddress);
      peerBalancesBefore = peerBalancesBefore.add(peer.balance);
    }
    
    assert.equal(peerBalancesBefore, 0, 'Wrong peer balances!');
    await splitter.split_all({ value: 5, from: owner });

    for (let peerAddress of peers) {
      let peer = await splitter.peerMap(peerAddress);
      peerBalancesAfter = peerBalancesAfter.add(peer.balance);
    }

    assert.equal(
      peerBalancesAfter,
      5,
      'Wrong ending balances!'
    );
  });

  it('should split between selected peers and return the change to sender', async() => {
    let peerBalancesBefore = new BN(0);
    let peerBalancesAfter = new BN(0);
    let peers = [user1, user2, owner];

    for (let peerAddress of peers) {
      let peer = await splitter.peerMap(peerAddress);
      peerBalancesBefore = peerBalancesBefore.add(peer.balance);
    }

    assert.equal(peerBalancesBefore, 0, 'Wrong peer balances!');
    await splitter.split([user1, user2], { value: 3, from: owner });

    for (let peerAddress of peers) {
      let peer = await splitter.peerMap(peerAddress);
      peerBalancesAfter = peerBalancesAfter.add(peer.balance);
    }

    assert.equal(
      peerBalancesAfter,
      3,
      'Wrong ending balances!'
    );
  });

  it('should enable peers to claim their balance', async() => {
    await splitter.addPeer(user1, { from: owner });

    let peer = await splitter.peerMap(user1);
    let tx = await splitter.claim(peer.balance, { from: user1 });

    assert.isTrue(tx.receipt.status, 'Unexpected error occurred while claiming!');
    assert.equal(tx.receipt.from, user1.toLowerCase(), 'Wrong recipient found in receipt!');
  });

  it('should not overflow when splitting', async() => {
    let amount = new BN(2).pow(new BN(256)).sub(new BN(1));

    await splitter.addPeer(owner, { from: owner });
    await splitter.addPeer(user1, { from: owner });
    await splitter.addPeer(user2, { from: owner });

    await splitter.split([user1, user2], { value: amount, from: user1 });
    await splitter.split([user1, user2], { value: amount, from: user2 });

    try {
      await splitter.split([user1, user2], { value: amount, from: owner });
    } catch (err) {
      assert.equal(err.reason, 'SafeMath: addition overflow');
    }
  });
});