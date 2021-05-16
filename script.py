from notion.client import NotionClient
from notion.block.basic import BulletedListBlock, CalloutBlock, HeaderBlock, NumberedListBlock, SubHeaderBlock, SubSubHeaderBlock, TextBlock, ToDoBlock, ToggleBlock
import sys

inputs = sys.argv[1:]
name = inputs.pop()
token = inputs.pop()
pl = inputs.pop()
command = inputs.pop()


def readFirstInstance(block, term):
    for child in block.children:
        if term in child.title:
            return child.get_browseable_url()
        if len(child.children) > 0:
            readFirstInstance(child)
    return "Not found, sorry!"


def deleteFirstInstance(block, term):
    for child in block.children:
        if term in child.title:
            child.remove()
            return "Block successfully deleted!"
        if len(child.children) > 0:
            readFirstInstance(child)
    return "Not found, sorry!"


crud = {
    'create': '',
    'read': readFirstInstance,
    'update': '',
    'delete': deleteFirstInstance,
}

client = NotionClient(token_v2=token)
page = client.get_block(pl)
page.title = name

print(crud[command](page, ' '.join(inputs)))
