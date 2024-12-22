<?php
/**
 * Plugin Name: Motif Oracle Notebook
 * Plugin URI: https://github.com/yourusername/motif-oracle-notebook
 * Description: A powerful web-based application for solo roleplaying, storytelling, and game session tracking, implementing the Motif system.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit;
}

// Enqueue scripts and styles
function motif_oracle_notebook_enqueue_scripts() {
    $plugin_url = plugin_dir_url(__FILE__);
    
    wp_enqueue_style('motif-ui', $plugin_url . 'css/motif-ui.css');
    wp_enqueue_script('motif-notebook', $plugin_url . 'js/motif-notebook.js', array(), '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'motif_oracle_notebook_enqueue_scripts');

// Register shortcode
function motif_oracle_notebook_shortcode() {
    $plugin_url = plugin_dir_url(__FILE__);
    ob_start();
    $html = file_get_contents(plugin_dir_path(__FILE__) . 'index.html');
    
    // Replace relative paths with absolute plugin paths
    $html = str_replace('src="lib/', 'src="' . $plugin_url . 'lib/', $html);
    $html = str_replace('src="js/', 'src="' . $plugin_url . 'js/', $html);
    $html = str_replace('href="css/', 'href="' . $plugin_url . 'css/', $html);
    $html = str_replace('href="lib/', 'href="' . $plugin_url . 'lib/', $html);
    
    echo $html;
    return ob_get_clean();
}
add_shortcode('motif_oracle_notebook', 'motif_oracle_notebook_shortcode');

// Add admin menu
function motif_oracle_notebook_admin_menu() {
    add_menu_page(
        'Motif Oracle Notebook',
        'Motif Oracle',
        'manage_options',
        'motif-oracle-notebook',
        'motif_oracle_notebook_admin_page',
        'dashicons-book-alt'
    );
}
add_action('admin_menu', 'motif_oracle_notebook_admin_menu');

// Admin page content
function motif_oracle_notebook_admin_page() {
    ?>
    <div class="wrap">
        <h1>Motif Oracle Notebook</h1>
        
        <h2>About</h2>
        <p>Motif Oracle Notebook is a powerful web-based application for solo roleplaying, storytelling, and game session tracking, implementing the Motif system.</p>
        
        <h2>Usage</h2>
        <p>To add the Motif Oracle Notebook to any page or post, simply use this shortcode:</p>
        <code>[motif_oracle_notebook]</code>
        
        <h2>Features</h2>
        <ul>
            <li>Three-die oracle system for generating narrative answers</li>
            <li>Rich text editing for notes and session tracking</li>
            <li>Flexible dice rolling system</li>
            <li>Session management with auto-save</li>
            <li>100% client-side operation - works offline</li>
        </ul>
        
        <h2>Version</h2>
        <p>Version: 1.0.0</p>
    </div>
    <?php
}
