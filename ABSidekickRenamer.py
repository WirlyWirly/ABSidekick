# Move (or copy) folders based on the contents of their 'metadata.json'

# python ./ABSidekickRenamer.py -o './_ABSidekick_' -ff '%author%/%title%' -fa '%title%' /path/to/audiobookshelf/library/folders

# For each input folder, search the tree for every 'metadata.json' file (Audiobookshelf)
# For each found 'metadata.json' file, move (or copy) the folder based on the contents of that file

__version__ = 0.20
import argparse
import json
import re
import shutil
import sys

from pathlib import Path

def rename_tracks(tracks_folder, track_template, meta_vars):
    # - For the provided tracks_folder, find all audio files in the tree and then rename them according to the track_template

    audio_extensions = ['mp3', 'm4b', 'm4a', 'ogg', 'opus']
    audio_files = []

    # Glob the tracks_folder for all audio type files
    for extension in audio_extensions:
        files = sorted(tracks_folder.rglob(f"./*.{extension}"))
        for item in files:
            audio_files.append(item)

    if len(audio_files) < 1:
        # This folder contains no audio type files
        return

    # - Sort files before renaming
    audio_files.sort()

    # - Rename each file according to track_template

    if len(audio_files) == 1:
        # - Single track folder: Rename without preceding track number

        # The single audio type file in the provided tracks_folder
        audio_file = audio_files[0]

        # Replace the %variables% with actual values
        item_format = template_substitution(track_template, meta_vars)

        # Create the absolute Path object
        item_format = tracks_folder / f"{item_format}{audio_file.suffix}"
        item_format.resolve()

        # Create the tree leading to the new item_format
        item_format.parent.mkdir(parents=True, exist_ok=True)

        # Rename the audio_file to the now resolved track_template
        audio_file.rename(item_format)

    else:
        # - Multi-track folder: Rename with preceding track number

        track = 1
        padding = 2 if len(audio_files) < 100 else 3

        for audio_file in audio_files:

            # Replace the %variables% with actual values
            item_format = template_substitution(track_template, meta_vars)

            # Create the absolute Path object for the new track path
            item_format = tracks_folder / f"{item_format}{audio_file.suffix}"

            # Create the tree leading to the new track path
            item_format.parent.mkdir(parents=True, exist_ok=True)

            # Add the track number and appropriate padding before the track name
            name_padded = f"{str(track).zfill(padding)} - {item_format.name}"
            track += 1

            # Rename the audio_file to the now resolved track_template
            audio_file.rename( item_format.parent / name_padded )

    print('Audio Files Renamed!')


def template_substitution(string_template, meta_vars):
    # - Substitute each %variable% in the string_template with it's appropriate value from the meta_vars dictionary

    for key in meta_vars:

        if meta_vars[key] != None and meta_vars[key] != False:
            cleaned = re.sub(clean_regex, '', meta_vars[key])
            string_template = re.sub(f"%{key}%", cleaned, string_template)

        else:
            string_template = re.sub(f"%{key}%", '', string_template)

    return string_template

print(fr'''
===============================================================
               ____   _____ _     _      _    _      _
         /\   |  _ \ / ____(_)   | |    | |  (_)    | |
        /  \  | |_) | (___  _  __| | ___| | ___  ___| | __
       / /\ \ |  _ < \___ \| |/ _` |/ _ \ |/ / |/ __| |/ /
      / ____ \| |_) |____) | | (_| |  __/   <| | (__|   <
     /_/    \_\____/|_____/|_|\__,_|\___|_|\_\_|\___|_|\_\

            A sidekick for Audiobookshelf (v{__version__})

===============================================================
''')


# The arguments parser
parser = argparse.ArgumentParser(prog='python ABSidekick.py', formatter_class=argparse.RawTextHelpFormatter, description="Organize Audiobookshelf library items based on the contents of their 'metadata.json' file")

parser.add_argument('-c', '--copy', action="store_true", help='Copy the item folder instead of renaming (moving) it')
parser.add_argument('-d', '--dry', action="store_true", help='Perform a dry-run, not making any actual changes')
parser.add_argument('-fa', '--formataudio', metavar="'template'", help="Specify a template that will be used when naming the audio files, same as --formatfolder")
parser.add_argument('-ff', '--formatfolder', metavar="'template'", help='Specify a template that will be used when naming the output folders. Empty placeholders will be blank\n\n- Template Placeholders -\n\n%%asin%%\n%%author%%\n%%isbn%%\n%%language%%\n%%narrator%%\n%%publisher%%\n%%series%%\n%%series#%%\n%%title%%\n%%year%%\n\n')
parser.add_argument('-o', '--output', dest='output', metavar='PATH', help='The output path of the folders')
parser.add_argument('-t', '--tag', metavar='TagName', help='Process only the items that include this tag')
parser.add_argument('-v', '--version', action='version', version=f"Version {__version__}")
parser.add_argument('input_folders', metavar='Input Folder(s)', nargs='+', help="Folder(s) from where a recursive search for 'metadata.json' will be performed")

args = parser.parse_args()

# Test the provided output directory
if args.output:
    test_output = Path(args.output).resolve()

    # If the output does not exist or is not valid, offer to create it
    if not test_output.is_dir():
        response = input(f"\nThe output path does not exist\n\n{test_output}\n\nWould you like to create it and continue? [y\\n]: ")
        if response.lower() in ['y', 'yes']:
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

print(f'''Input Folder(s): {' | '.join([f'"{folder}"' for folder in search_folders])}''')
print(f'Output Folder: "{output_folder}"\n')

print('File Action: Copy') if args.copy else print('File Action: Rename [move]')
print(f'Metadata Files: {len(all_metadata_files)}')
print(f'Folder Template: "{args.formatfolder}"') if args.formatfolder else None
print(f'Audio Template: "{args.formataudio}"') if args.formataudio else None


response = input('\nContinue? [y\\n]: ')

if response.lower() in ['n', 'no']:
    sys.exit()


# When formatting output templates, any character NOT in this regex will be removed
clean_regex = r"[^\w\.\-\_\!\(\)\[\]\{\} ]"

# For each 'metadata.json', determine the new foldername
summary = ''
skipped_count = 0
error_count = 0
for metadata_file in all_metadata_files:

    # Read the contents of 'metadata.json'
    with metadata_file.open('r', encoding='utf-8') as file:
        metadata = json.load(file)

    print('\n===============================================================\n')
    print(f"{metadata.get('title')}\n")

    # If the metadata has no 'authors' value, then it will be skipped
    if (not metadata.get('authors')):
        print(f"Skip | No Author | {metadata_file}")
        summary = f"{summary}\nSkip | No Author | {metadata_file}"
        skipped_count += 1
        continue

    # If a specific tag was provided, then check to make sure this metadata contains that tag
    if ( args.tag != None ):
        item_tags = metadata.get('tags')
        if ( args.tag not in item_tags ):
            print(f"Skip | Not Tagged | {metadata_file.parent}")
            summary = f"{summary}\nSkip | Not Tagged | {metadata_file.parent}"
            skipped_count += 1
            continue


    # The variables that will be available for string formatting
    meta_vars = {
        'asin': metadata.get('asin'),
        'author': metadata.get('authors')[0],
        'isbn': metadata.get('isbn'),
        'language': metadata.get('language'),
        'narrator': metadata.get('narrators')[0] if len(metadata.get('narrators')) > 0 else None,
        'publisher': metadata.get('publisher'),
        'series': metadata.get('series'),
        'title': metadata.get('title'),
        'year': metadata.get('publishedYear'),
    }

    # Check for a series and if so update the meta dictionary with the series name
    if len(meta_vars['series']) > 0:

        series = meta_vars['series'][0]
        series_name = re.search(r"^(.+?)( \#.+)?$", series)
        series_number = re.search(r"\#([\d\.\-]+)$", series)

        meta_vars['series'] = series_name[1]
        meta_vars['series#'] = series_number[1] if series_number else None

    else:
        meta_vars['series'] = None
        meta_vars['series#'] = None

    # String format the output path as specified by the user
    if args.formatfolder != None:
        item_format = args.formatfolder

        item_format = template_substitution(item_format, meta_vars)

        new_foldername = output_folder / item_format

    else:
        # Create the new foldername using the available metadata
        author = re.sub(clean_regex, '', metadata.get('authors')[0])
        title = re.sub(clean_regex, '', metadata.get('title'))

        new_foldername = output_folder / f"{author}/{title}/"

    new_foldername.resolve()

    # Verify new_foldername does not already exists, and if so append a increment counter
    counter = 0
    counter_foldername = new_foldername
    while counter_foldername.exists() == True:
        counter += 1
        counter_foldername = Path(f"{str(new_foldername)}_0{counter}/")

    new_foldername = counter_foldername.resolve()

    # The current path of 'metadata.json'
    current_folder = metadata_file.parent

    print(f"Old: {current_folder}")
    print(f"New: {new_foldername}\n")

    if args.dry == True:
        # This IS a dry run
        print('--- Dry ---')

    else:
        # This is NOT a dry run

        try:

            # Create the tree leading to new_foldername
            new_foldername.parent.mkdir(parents=True, exist_ok=True)

            # Copy the folder
            if args.copy == True:
                shutil.copytree(current_folder, new_foldername, dirs_exist_ok=True, copy_function=shutil.copy2)
                print('Folder Copied!')

            # Rename (Move) the folder
            else:
                current_folder.rename(new_foldername)

                # Check for and delete a now empty parent directory
                if any(current_folder.parent.iterdir()) == False:
                    shutil.rmtree(current_folder.parent)

                print('Folder Moved!')

            if args.formataudio != None:
                # A string format for the audio files was provided, so rename the newly moved\copied files
                rename_tracks(new_foldername, args.formataudio, meta_vars)

        except Exception as error:
            print(f"Error: {error}")
            summary = f"{summary}\nError | {metadata_file}"
            error_count += 1

    # The separator between processed metadata files


print(fr'''
===============================================================
             ______ _       _     _              _
            |  ____(_)     (_)   | |            | |
            | |__   _ _ __  _ ___| |__   ___  __| |
            |  __| | | '_ \| / __| '_ \ / _ \/ _` |
            | |    | | | | | \__ \ | | |  __/ (_| |
            |_|    |_|_| |_|_|___/_| |_|\___|\__,_|

===============================================================

There were {skipped_count} skipped item(s) and {error_count} recorded error(s)
''')

if skipped_count > 0 or error_count > 0:
    response = input(f"Press Enter to exit or 's' to view a summary of any skipped\errored items: ")

    if response.lower() == 's':
        print(summary)

else:
    response = input(f"Press Enter to exit...")
