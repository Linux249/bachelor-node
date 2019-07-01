import fetch from 'node-fetch';
import { pythonApi } from '../config/pythonApi';
import { buildLabels } from '../util/buildLabels';

export default socket => async (data) => {
    console.log('updateEmbedding');
    // console.log(data);

    let newNodes = {};

    // HINT The data should never by empty - inital nodes comes from getNodes
    const { nodes, userId } = data;
    // categories can but don't have to change
    let categories;

    if (process.env.NODE_ENV === 'development') {
        // generate random x, y for new nodes
        Object.keys(nodes).forEach((i) => {
            const node = nodes[i];
            node.x += Math.random() >= 0.5 ? node.x * 0.1 : -node.x * 0.1;
            node.y += Math.random() >= 0.5 ? node.y * 0.1 : -node.y * 0.1;
            newNodes[i] = node;
        });
        // add dummy categories
        categories = ['kat1', 'kat2', 'kat3'];
    } else {
        try {
            const time2 = process.hrtime();
            const res = await fetch(`${pythonApi}/nodes`, {
                method: 'POST',
                header: { 'Content-type': 'application/json' },
                body: JSON.stringify({ nodes, userId, init: false }),
            });
            // there are only nodes comming back from here
            const result = await res.json();
            newNodes = result.nodes;
            categories = result.categories;
            const diff2 = process.hrtime(time2);
            console.log(`getNodesFromPython took ${diff2[0] + diff2[1] / 1e9} seconds`);
        } catch (err) {
            console.error('error - get nodes from python - error');
            console.error(err);
        }
    }

    // build labels - labels are scanned server side
    const labels = categories ? buildLabels(categories, nodes) : undefined;

    // if new categories comes from server than send new labels back
    if (labels) socket.emit('updateCategories', { labels });

    socket.emit('updateEmbedding', { nodes: newNodes });
};
