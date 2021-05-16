from notion.client import NotionClient
from notion.block.basic import BulletedListBlock, CalloutBlock, HeaderBlock, NumberedListBlock, SubHeaderBlock, SubSubHeaderBlock, TextBlock, ToDoBlock, ToggleBlock
import sys
from notion.block.upload import ImageBlock, VideoBlock

inputs = sys.argv[1:]
name = inputs.pop()
token = inputs.pop()
pl = inputs.pop()
command = inputs.pop()
found = False


def readFirstInstance(block, arr):
    term = ' '.join(arr).strip()
    for child in block.children:
        if hasattr(child, 'title'):
            if term in child.title:
                print(child.get_browseable_url())
                global found
                found = True
        if len(child.children) > 0:
            readFirstInstance(child, arr)


def deleteFirstInstance(block, arr):
    term = ' '.join(arr).strip()
    for child in block.children:
        if hasattr(child, 'title'):
            if term in child.title:
                child.remove()
                print("Block successfully deleted!")
                global found
                found = True
        if len(child.children) > 0:
            deleteFirstInstance(child, arr)


def addToBlock(block, arr):
    args = arr.pop(0)
    arr.pop()
    for line in arr:
        if line.startswith('###'):
            block.children.add_new(
                SubSubHeaderBlock, title=line.replace('###', '').strip())
        elif line.startswith('##'):
            block.children.add_new(
                SubHeaderBlock, title=line.replace('##', '').strip())
        elif line.startswith('#'):
            block.children.add_new(
                HeaderBlock, title=line.replace('#', '').strip())
        elif line.startswith('[]'):
            block.children.add_new(
                ToDoBlock, title=line.replace('[]', '').strip())
        elif line.startswith('$$'):
            block.children.add_new(
                NumberedListBlock, title=line.replace('$$', '').strip())
        elif line.startswith('??'):
            block.children.add_new(
                BulletedListBlock, title=line.replace('??', '').strip())
        elif line.startswith('^'):
            block.children.add_new(
                CalloutBlock, title=line.replace('^', '').strip())
        else:
            block.children.add_new(TextBlock, title=line.strip())
    print("Add command with label " + args + " successful!")
    global found
    found = True


def updateBlock(block, arr):
    term = arr[0]
    for child in block.children:
        if hasattr(child, 'title'):
            if term in child.title:
                child.title = ' '.join(arr[1:])
                print("Block title updated!")
                global found
                found = True
        if len(child.children) > 0:
            readFirstInstance(child, arr)


def addImgBlock(block, arr):
    media = block.children.add_new(ImageBlock)
    media.set_source_url(arr[0])
    print("Image successfully added!")
    global found
    found = True


def addVideoBlock(block, arr):
    media = block.children.add_new(VideoBlock)
    media.set_source_url(arr[0])
    print("Video successfully added!")
    global found
    found = True


crud = {
    'create': addToBlock,
    'read': readFirstInstance,
    'update': updateBlock,
    'delete': deleteFirstInstance,
    'img': addImgBlock,
    'video': addVideoBlock
}

client = NotionClient(token_v2=token)
page = client.get_block(pl)
page.title = name

if command == 'lock':
    page.change_lock(locked=True)
elif command == 'unlock':
    page.change_lock(locked=False)
else:
    crud[command](page, inputs)
    if not found:
        print("Sorry, not found any matches!")
