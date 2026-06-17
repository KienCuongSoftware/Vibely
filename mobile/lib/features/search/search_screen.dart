import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../api/search_api.dart';
import '../../models/search_models.dart';
import '../../theme/vibely_theme.dart';
import '../../utils/format_count.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final SearchApi _searchApi = SearchApi();
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  Timer? _debounce;
  SearchSuggestPayload _suggest = const SearchSuggestPayload();
  List<SearchUserResult> _resultUsers = const [];
  List<SearchVideoResult> _resultVideos = const [];

  bool _loadingSuggest = false;
  bool _loadingResults = false;
  String? _error;
  String _submittedQuery = '';

  @override
  void initState() {
    super.initState();
    _loadSuggest('');
    _controller.addListener(_onQueryChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.removeListener(_onQueryChanged);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged() {
    if (_submittedQuery.isNotEmpty) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _loadSuggest(_controller.text);
    });
  }

  Future<void> _loadSuggest(String query) async {
    setState(() {
      _loadingSuggest = true;
      _error = null;
    });

    try {
      final payload = await _searchApi.suggest(query: query);
      if (!mounted) return;
      setState(() {
        _suggest = payload;
        _loadingSuggest = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingSuggest = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _submitSearch([String? raw]) async {
    final q = (raw ?? _controller.text).trim();
    if (q.isEmpty) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _submittedQuery = q;
      _controller.text = q;
      _loadingResults = true;
      _error = null;
      _resultUsers = const [];
      _resultVideos = const [];
    });

    try {
      final results = await Future.wait([
        _searchApi.searchUsers(q),
        _searchApi.searchVideos(q),
      ]);
      if (!mounted) return;
      setState(() {
        _resultUsers = results[0] as List<SearchUserResult>;
        _resultVideos = results[1] as List<SearchVideoResult>;
        _loadingResults = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingResults = false;
        _error = e.toString();
      });
    }
  }

  void _clearSubmitted() {
    setState(() {
      _submittedQuery = '';
      _resultUsers = const [];
      _resultVideos = const [];
      _error = null;
    });
    _loadSuggest(_controller.text);
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final showingResults = _submittedQuery.isNotEmpty;

    return Scaffold(
      backgroundColor: VibelyColors.black,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SearchHeader(
              controller: _controller,
              focusNode: _focusNode,
              onBack: () => Navigator.of(context).maybePop(),
              onSubmit: () => _submitSearch(),
              onClear: showingResults ? _clearSubmitted : () => _controller.clear(),
            ),
            Expanded(
              child: showingResults
                  ? _buildResults()
                  : _buildSuggest(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggest() {
    if (_loadingSuggest && _suggest.trending.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: VibelyColors.tiktokRed),
      );
    }

    if (_error != null && _suggest.trending.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
        ),
      );
    }

    final hasQuery = _controller.text.trim().isNotEmpty;

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      children: [
        if (hasQuery && _suggest.users.isNotEmpty) ...[
          _sectionTitle('Người dùng'),
          ..._suggest.users.map(_userTile),
          const SizedBox(height: 16),
        ],
        if (hasQuery && _suggest.videos.isNotEmpty) ...[
          _sectionTitle('Video'),
          ..._suggest.videos.map(_videoTile),
          const SizedBox(height: 16),
        ],
        if (_suggest.trending.isNotEmpty) ...[
          Row(
            children: [
              Expanded(child: _sectionTitle('Nội dung tìm kiếm thịnh hành')),
              TextButton(
                onPressed: () => _loadSuggest(_controller.text),
                child: const Text(
                  'Làm mới',
                  style: TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ),
            ],
          ),
          ..._suggest.trending.map(
            (item) => _suggestRow(
              title: item.keyword,
              subtitle: 'Thịnh hành',
              onTap: () => _submitSearch(item.keyword),
            ),
          ),
        ],
        if (!hasQuery &&
            _suggest.users.isEmpty &&
            _suggest.videos.isEmpty &&
            _suggest.trending.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 48),
            child: Text(
              'Nhập từ khóa để tìm người dùng và video trên Vibely.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white54, fontSize: 14),
            ),
          ),
      ],
    );
  }

  Widget _buildResults() {
    if (_loadingResults) {
      return const Center(
        child: CircularProgressIndicator(color: VibelyColors.tiktokRed),
      );
    }

    if (_error != null) {
      return Center(
        child: Text(
          _error!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white70),
        ),
      );
    }

    if (_resultUsers.isEmpty && _resultVideos.isEmpty) {
      return Center(
        child: Text(
          'Không có kết quả cho "$_submittedQuery"',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white70),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      children: [
        if (_resultUsers.isNotEmpty) ...[
          _sectionTitle('Người dùng'),
          ..._resultUsers.map(_userTile),
          const SizedBox(height: 20),
        ],
        if (_resultVideos.isNotEmpty) ...[
          _sectionTitle('Video'),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 10,
              childAspectRatio: 9 / 16,
            ),
            itemCount: _resultVideos.length,
            itemBuilder: (context, index) => _videoCard(_resultVideos[index]),
          ),
        ],
      ],
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _userTile(SearchUserResult user) {
    final name = user.displayName.trim().isNotEmpty
        ? user.displayName
        : user.username;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      leading: CircleAvatar(
        backgroundColor: Colors.grey.shade800,
        backgroundImage: user.avatarUrl != null && user.avatarUrl!.isNotEmpty
            ? CachedNetworkImageProvider(user.avatarUrl!)
            : null,
        child: user.avatarUrl == null || user.avatarUrl!.isEmpty
            ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?')
            : null,
      ),
      title: Text(
        name,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        '@${user.username}',
        style: const TextStyle(color: Colors.white54),
      ),
      onTap: () => _submitSearch(user.username),
    );
  }

  Widget _videoTile(SearchVideoResult video) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: SizedBox(
          width: 48,
          height: 64,
          child: _thumb(video.thumbnailUrl),
        ),
      ),
      title: Text(
        video.caption,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: Colors.white, fontSize: 14),
      ),
      subtitle: Text(
        '@${video.authorUsername ?? 'user'}',
        style: const TextStyle(color: Colors.white54, fontSize: 12),
      ),
      onTap: () {},
    );
  }

  Widget _videoCard(SearchVideoResult video) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              fit: StackFit.expand,
              children: [
                _thumb(video.thumbnailUrl),
                Positioned(
                  left: 8,
                  bottom: 8,
                  child: Row(
                    children: [
                      const Icon(Icons.play_arrow, color: Colors.white, size: 16),
                      Text(
                        formatCompactCount(video.viewCount),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          video.caption,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      ],
    );
  }

  Widget _thumb(String? url) {
    final src = url?.trim() ?? '';
    if (src.isEmpty) {
      return Container(color: Colors.grey.shade900);
    }
    return CachedNetworkImage(
      imageUrl: src,
      fit: BoxFit.cover,
      errorWidget: (_, _, _) => Container(color: Colors.grey.shade900),
    );
  }

  Widget _suggestRow({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      leading: Container(
        width: 8,
        height: 8,
        decoration: const BoxDecoration(
          color: VibelyColors.tiktokRed,
          shape: BoxShape.circle,
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
      ),
      subtitle: Text(subtitle, style: const TextStyle(color: Colors.white38)),
      trailing: const Icon(Icons.search, color: Colors.white38, size: 20),
      onTap: onTap,
    );
  }
}

class _SearchHeader extends StatelessWidget {
  const _SearchHeader({
    required this.controller,
    required this.focusNode,
    required this.onBack,
    required this.onSubmit,
    required this.onClear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onBack;
  final VoidCallback onSubmit;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 8, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back, color: Colors.white),
          ),
          Expanded(
            child: ListenableBuilder(
              listenable: controller,
              builder: (context, _) {
                return Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF27272A),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 12),
                      const Icon(Icons.search, color: Colors.white38, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: controller,
                          focusNode: focusNode,
                          autofocus: true,
                          style: const TextStyle(color: Colors.white, fontSize: 15),
                          decoration: const InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            hintText: 'Tìm kiếm',
                            hintStyle: TextStyle(color: Colors.white38),
                          ),
                          textInputAction: TextInputAction.search,
                          onSubmitted: (_) => onSubmit(),
                        ),
                      ),
                      if (controller.text.isNotEmpty)
                        IconButton(
                          onPressed: onClear,
                          icon: const Icon(Icons.close, color: Colors.white38, size: 18),
                          padding: EdgeInsets.zero,
                          constraints:
                              const BoxConstraints(minWidth: 32, minHeight: 32),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
          ListenableBuilder(
            listenable: controller,
            builder: (context, _) {
              return TextButton(
                onPressed: controller.text.trim().isEmpty ? null : onSubmit,
                child: const Text(
                  'Tìm kiếm',
                  style: TextStyle(
                    color: VibelyColors.tiktokRed,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
