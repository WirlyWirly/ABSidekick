# Move (or copy) folders based on the contents of their 'metadata.json'

# python ./ABSidekickRenamer.py -f '%author%/%title%' -o './_ABSidekick_' /path/to/matched/folder

# For each input folder, search the tree for each 'metadata.json' file (Audiobookshelf)
# For each found 'metadata.json' file, move (or copy) the folder based on the metadata

__version__ = 0.10
import argparse
import json
import re
import shutil
import sys

from pathlib import Path

# The arguments parser
parser = argparse.ArgumentParser(prog='python ABSidekick.py', formatter_class=argparse.RawTextHelpFormatter, description="Organize Audiobookshelf matches using the 'metadata.json' of each item")
parser.add_argument('-c', '--copy', action="store_true", help='Copy the item folder instead of renaming (moving) it')
parser.add_argument('-d', '--dry', action="store_true", help='Perform a dry-run, not making any actual changes')
parser.add_argument('-f', '--format', metavar="'String Format'", help='Specify a format for the output folders\n\n%%asin%% %%author%% %%isbn%% %%language%% %%narrator%% %%publisher%% %%title%% %%year%%\n\n')
parser.add_argument('-o', '--output', dest='output', metavar='PATH', required=True, help='The output path of the process')
parser.add_argument('-t', '--tag', metavar='TagName', help='Process only the items that include this tag')
parser.add_argument('-v', '--version', action='version', version=f"Version {__version__}")
parser.add_argument('input_folders', metavar='Input Folder(s)', nargs='+', help="Folder(s) from where a recursive search for 'metadata.json' will be performed")

args = parser.parse_args()

# Test the provided output directory
if args.output:
    test_output = Path(args.output).resolve()

    # If the output does not exist or is not valid, offer to create it
    if not test_output.is_dir():
        print(f"\nThe output path does not exist\n\n{test_output}")
        response = input("\nWould you like to create it and continue? [y\\n]: ")
        if response.lower() in ['y', 'yes']:
            test_output.mkdir(parents=True)
            output_folder = test_output
        else:
            sys.exit()
    else:
        output_folder = Path(args.output).resolve()

else:
    output_folder = Path.cwd() / '__ABSidekick__'


# Glob the tree of each input folder for every 'metadata.json'
all_metadata_files = []
search_folders = [Path(argument).resolve() for argument in args.input_folders]
for folder in search_folders:

    # Search each input folder for 'metadata.json'
    for json_file in folder.glob('**/metadata.json'):
        if str(output_folder) not in str(json_file):
            all_metadata_files.append(json_file)

# The output string formatting
out_format = args.format
clean_regex = r"[^\w\.\-\_\!\(\)\[\] ]"

# For each 'metadata.json', determine the new foldername
summary = ''
for metadata_file in all_metadata_files:

    # Read the contents of 'metadata.json'
    with metadata_file.open('r', encoding='utf-8') as file:
        metadata = json.load(file)

    print(metadata.get('title'))

    # If the metadata has no 'authors', then it will be skipped
    if (not metadata.get('authors')):
        print(f"Skip | No Author | {metadata_file}")
        summary = f"{summary}\nSkip | No Author | {metadata_file}"
        print('\n---------------------------\n')
        continue

    # If a specific tag was provided, then check to make sure this metadata contains that tag
    if ( args.tag != None ):
        item_tags = metadata.get('tags')
        if ( args.tag not in item_tags ):
            print(f"Skip | Not Tagged | {metadata_file.parent}")
            summary = f"{summary}\nSkip | Not Tagged | {metadata_file.parent}"
            print('\n---------------------------\n')
            continue


    # The variables that will be available for string formatting
    variables = {
        'asin': metadata.get('asin'),
        'author': metadata.get('authors')[0],
        'isbn': metadata.get('isbn'),
        'language': metadata.get('language'),
        'narrator': metadata.get('narrators')[0],
        'publisher': metadata.get('publisher'),
        'title': metadata.get('title'),
        'year': metadata.get('publishedYear'),
    }

    # String format the output path as specified by the user
    if out_format != None:
        item_format = out_format

        for key in variables:
            if variables[key] != None and variables[key] != False:
                cleaned = re.sub(clean_regex, '', variables[key])
                item_format = re.sub(f"%{key}%", cleaned, item_format)
            else:
                item_format = re.sub(f"%{key}%", '', item_format)

        new_foldername = output_folder / item_format

    else:
        # Create the new foldername using the available metadata
        author = re.sub(clean_regex, '', metadata.get('authors')[0])
        title = re.sub(clean_regex, '', metadata.get('title'))

        new_foldername = output_folder / f"{author}/{title}/"

    new_foldername.resolve()

    # Verify new_foldername does not already exists, and if so append a increment counter
    counter = 0
    while new_foldername.exists() == True:
        counter += 1
        new_foldername = Path(f"{str(new_foldername)}_0{counter}/")

    # The current path of 'metadata.json'
    current_folder = metadata_file.parent

    print(f"Old: {current_folder}")
    print(f"New: {new_foldername}")

    if args.dry != True:
        # This is NOT a dry run

        try:

            new_foldername.parent.mkdir(parents=True, exist_ok=True)

            # Copy the files
            if args.copy == True:
                shutil.copytree(current_folder, new_foldername, dirs_exist_ok=True, copy_function=shutil.copy2)
                print('Success! [Copied]')

            # Rename (Move) the files
            else:
                current_folder.rename(new_foldername)

                # Check for and delete a empty parent directory
                # if any(current_folder.parent.iterdir()) == False:
                #     shutil.rmtree(current_folder.parent)
                print('Success! [Moved]')

        except Exception as error:
            print(f"Error: {error}")
            summary = f"{summary}\nError | {metadata_file}"
    else:
        # This IS a dry run
        print('--- Dry ---')

    print('\n---------------------------\n')

response = input("The process has completed, press Enter to exit or 's' to view a summary of skipped items: ")

if response.lower() == 's':
    print(summary)
