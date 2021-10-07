const logger = require('../../services/logger.service')
const dbService = require('../../services/db.service')
const ObjectId = require('mongodb').ObjectId
const asyncLocalStorage = require('../../services/als.service')

async function query(filterBy = {}) {
    const criteria = _buildCriteria(filterBy)
    console.log('filterBy', filterBy)

    try {
        const collection = await dbService.getCollection('board')
        const boards = await collection.find(criteria).toArray()
        return boards
    } catch (err) {
        logger.error('cannot find boards', err)
        throw err
    }
}

async function remove(boardId) {
    try {
        const collection = await dbService.getCollection('board')
        await collection.deleteOne({ '_id': ObjectId(boardId) })
    } catch (err) {
        logger.error(`cannot remove board ${boardId}`, err)
        throw err
    }
}

async function save(board) {
    const { title, createdBy, style, labels, members, lists, activities, star } = board

    let saveBoard
    if (board._id) {

        try {
            savedBoard = {
                _id: ObjectId(board._id),
                title,
                createdBy,
                style,
                labels,
                members,
                lists,
                activities: activities.slice(0, 20),
                star
            }
            const collection = await dbService.getCollection('board')
            await collection.updateOne({ _id: savedBoard._id }, { $set: savedBoard })
            return savedBoard


        } catch (err) {
            logger.error('cannot update board', err)
            throw err
        }
    }
    else {
        try {
            savedBoard = {
                createdAt: ObjectId(board._id).getTimestamp(),
                title: board.title,
                createdBy: board.createdBy,
                style: board.style,
                labels: [],
                members: [board.createdBy],
                lists: [],
                activities: []
            }
            const collection = await dbService.getCollection('board')
            await collection.insertOne(savedBoard)
            return savedBoard
        } catch (err) {
            logger.error('cannot add board', err)
            throw err
        }

    }
}

async function getById(boardId) {
    try {
        //console.log('boardId', boardId)
        const collection = await dbService.getCollection('board')
        const board = await collection.findOne({ '_id': ObjectId(boardId) })
        return board
    } catch (err) {
        logger.error(`while finding board ${boardId}`, err)
        throw err
    }
}

function _buildCriteria(filter) {
    const criteria = {}

    if (filter.boardId) {
        criteria.boardId = ObjectId(filter.boardId);
    }

    return criteria
}

module.exports = {
    query,
    remove,
    getById,
    save
}


