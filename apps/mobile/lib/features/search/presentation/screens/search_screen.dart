import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Rechercher'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            children: <Widget>[
              TextField(
                controller: _controller,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Nom, prénom, village…',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: OriginColors.offWhite,
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(OriginRadius.md),
                    borderSide: BorderSide.none,
                  ),
                ),
                onSubmitted: (_) {},
              ),
              const SizedBox(height: OriginSpacing.lg),
              Expanded(
                child: _controller.text.isEmpty
                    ? const _SearchHint()
                    : const EmptyStateView(
                        icon: Icons.search_off,
                        title: 'Pas encore de résultat',
                        subtitle:
                            'Essaye avec un autre nom ou un village.',
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchHint extends StatelessWidget {
  const _SearchHint();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        'Tape un nom pour commencer.',
        style:
            OriginTextStyles.body.copyWith(color: OriginColors.textMuted),
      ),
    );
  }
}
